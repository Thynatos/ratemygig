// Database Sync Service
// Handles upserting events, venues, and artists to Supabase

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ProviderEvent, ProviderArtist, ProviderVenue } from '../ticketmaster/index.js';

export interface SyncStats {
    eventsCreated: number;
    eventsUpdated: number;
    venuesCreated: number;
    artistsCreated: number;
    eventArtistsLinked: number;
    errors: string[];
}

type Row = Record<string, unknown>;

interface SaveResult {
    id: string | null;
    isNew: boolean;
    error?: string;
}

interface Entry<S> {
    source: S;
    row: Row;
    key: string;
}

interface SavedRows {
    ids: Map<string, string>;
    created: number;
    updated: number;
}

interface SavedEvent {
    event: ProviderEvent;
    id: string;
}

// Columns of each table's unique constraint (001_initial_schema.sql). They are
// the ON CONFLICT targets, and rows are deduplicated on exactly these columns.
const VENUE_KEY = ['name', 'city', 'country'];
const ARTIST_KEY = ['name'];
const EVENT_KEY = ['provider', 'provider_event_id'];
const LINK_KEY = ['event_id', 'artist_id'];

function keyOf(row: Row, columns: string[]): string {
    return JSON.stringify(columns.map(column => row[column]));
}

function dedupe<S>(candidates: { source: S; row: Row }[], columns: string[]): Entry<S>[] {
    const entries = new Map<string, Entry<S>>();
    for (const { source, row } of candidates) {
        const key = keyOf(row, columns);
        if (!entries.has(key)) {
            entries.set(key, { source, row, key });
        }
    }
    return [...entries.values()];
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export class SyncService {
    private supabase: SupabaseClient;
    private provider: string;

    constructor(
        supabaseUrl: string,
        serviceRoleKey: string,
        provider: string = 'ticketmaster',
        client?: SupabaseClient
    ) {
        this.supabase = client ?? createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
        });
        this.provider = provider;
    }

    // ============================================
    // Row Mapping
    // ============================================

    // Every row of a bulk upsert must carry the same keys: supabase-js sends the
    // union of all keys as the column list and writes NULL where a row lacks one.
    private venueRow(venue: ProviderVenue): Row {
        return {
            name: venue.name,
            city: venue.city,
            country: venue.country,
            lat: venue.lat || null,
            lng: venue.lng || null,
            provider_venue_id: venue.id,
        };
    }

    private artistRow(artist: ProviderArtist): Row {
        return {
            name: artist.name,
            provider_artist_id: artist.id,
            image_url: artist.imageUrl || null,
        };
    }

    private eventRow(event: ProviderEvent, venueId: string | null): Row {
        return {
            provider: this.provider,
            provider_event_id: event.id,
            name: event.name,
            start_at: event.startAt.toISOString(),
            city: event.venue.city,
            country: event.venue.country,
            venue_id: venueId,
            ticket_urls: event.ticketUrls,
            lineup: event.artists.map(a => a.name),
            image_url: event.imageUrl || null,
        };
    }

    // ============================================
    // Venue Sync
    // ============================================

    async upsertVenue(venue: ProviderVenue): Promise<{ id: string | null; isNew: boolean }> {
        // Check if venue exists (same keys as the previous upsert conflict target)
        const { data: existing } = await this.supabase
            .from('venues')
            .select('id')
            .eq('name', venue.name)
            .eq('city', venue.city)
            .eq('country', venue.country)
            .single();

        const venueData = this.venueRow(venue);

        if (existing) {
            const { error } = await this.supabase
                .from('venues')
                .update(venueData)
                .eq('id', existing.id);

            if (error) {
                console.error(`Error updating venue ${venue.name}:`, error);
                return { id: null, isNew: false };
            }

            return { id: existing.id, isNew: false };
        }

        const { data, error } = await this.supabase
            .from('venues')
            .insert(venueData)
            .select('id')
            .single();

        if (error) {
            console.error(`Error inserting venue ${venue.name}:`, error);
            // Insert may have lost a race with a concurrent insert — look it up
            const { data: fallback } = await this.supabase
                .from('venues')
                .select('id')
                .eq('name', venue.name)
                .eq('city', venue.city)
                .eq('country', venue.country)
                .single();

            return { id: fallback?.id || null, isNew: false };
        }

        return { id: data?.id || null, isNew: true };
    }

    // ============================================
    // Artist Sync
    // ============================================

    async upsertArtist(artist: ProviderArtist): Promise<{ id: string | null; isNew: boolean }> {
        // Check if artist exists (same key as the previous upsert conflict target)
        const { data: existing } = await this.supabase
            .from('artists')
            .select('id')
            .eq('name', artist.name)
            .single();

        const artistData = this.artistRow(artist);

        if (existing) {
            const { error } = await this.supabase
                .from('artists')
                .update(artistData)
                .eq('id', existing.id);

            if (error) {
                console.error(`Error updating artist ${artist.name}:`, error);
                return { id: null, isNew: false };
            }

            return { id: existing.id, isNew: false };
        }

        const { data, error } = await this.supabase
            .from('artists')
            .insert(artistData)
            .select('id')
            .single();

        if (error) {
            console.error(`Error inserting artist ${artist.name}:`, error);
            // Insert may have lost a race with a concurrent insert — look it up
            const { data: fallback } = await this.supabase
                .from('artists')
                .select('id')
                .eq('name', artist.name)
                .single();

            return { id: fallback?.id || null, isNew: false };
        }

        return { id: data?.id || null, isNew: true };
    }

    // ============================================
    // Event Sync
    // ============================================

    async upsertEvent(
        event: ProviderEvent,
        venueId: string | null
    ): Promise<{ id: string | null; isNew: boolean; error?: string }> {
        // Check if event exists
        const { data: existing } = await this.supabase
            .from('events')
            .select('id')
            .eq('provider', this.provider)
            .eq('provider_event_id', event.id)
            .single();

        const eventData = this.eventRow(event, venueId);

        if (existing) {
            // Update existing event
            const { error } = await this.supabase
                .from('events')
                .update({
                    ...eventData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

            if (error) {
                console.error(`Error updating event ${event.id}:`, error);
                return { id: null, isNew: false, error: error.message };
            }

            return { id: existing.id, isNew: false };
        } else {
            // Insert new event
            const { data, error } = await this.supabase
                .from('events')
                .insert(eventData)
                .select('id')
                .single();

            if (error) {
                console.error(`Error inserting event ${event.id}:`, error);
                return { id: null, isNew: false, error: error.message };
            }

            return { id: data?.id || null, isNew: true };
        }
    }

    // ============================================
    // Event-Artist Link
    // ============================================

    async linkEventArtists(eventId: string, artistIds: string[]): Promise<number> {
        let linked = 0;

        for (let i = 0; i < artistIds.length; i++) {
            const artistId = artistIds[i];
            const { error } = await this.supabase
                .from('event_artists')
                .upsert(
                    {
                        event_id: eventId,
                        artist_id: artistId,
                        billing_order: i + 1,
                    },
                    { onConflict: 'event_id,artist_id' }
                );

            if (error) {
                console.error(`Error linking artist ${artistId} to event ${eventId}:`, error);
            } else {
                linked++;
            }
        }

        return linked;
    }

    // ============================================
    // Batch Sync
    // ============================================

    /**
     * Saves one page of events with a handful of bulk upserts
     * (venues -> artists -> events -> event_artists) instead of several
     * round trips per event. A stage whose bulk upsert fails falls back to the
     * row-by-row methods above for the rows it did not save, so a single bad
     * row costs only itself.
     */
    async syncEvents(events: ProviderEvent[]): Promise<SyncStats> {
        const stats: SyncStats = {
            eventsCreated: 0,
            eventsUpdated: 0,
            venuesCreated: 0,
            artistsCreated: 0,
            eventArtistsLinked: 0,
            errors: [],
        };

        if (events.length === 0) {
            return stats;
        }

        const venueIds = await this.syncVenues(events, stats);
        const artistIds = await this.syncArtists(events, stats);
        const savedEvents = await this.syncEventRows(events, venueIds, stats);
        await this.syncLinks(savedEvents, artistIds, stats);

        return stats;
    }

    private async syncVenues(events: ProviderEvent[], stats: SyncStats): Promise<Map<string, string>> {
        const entries = dedupe(
            events.map(event => ({ source: event.venue, row: this.venueRow(event.venue) })),
            VENUE_KEY
        );

        const { saved } = await this.saveStage('venues', entries, VENUE_KEY, venue => this.upsertVenue(venue));

        stats.venuesCreated += saved.created;
        return saved.ids;
    }

    private async syncArtists(events: ProviderEvent[], stats: SyncStats): Promise<Map<string, string>> {
        const entries = dedupe(
            events.flatMap(event => event.artists).map(artist => ({ source: artist, row: this.artistRow(artist) })),
            ARTIST_KEY
        );

        const { saved } = await this.saveStage('artists', entries, ARTIST_KEY, artist => this.upsertArtist(artist));

        stats.artistsCreated += saved.created;
        return saved.ids;
    }

    private async syncEventRows(
        events: ProviderEvent[],
        venueIds: Map<string, string>,
        stats: SyncStats
    ): Promise<SavedEvent[]> {
        const venueIdOf = (event: ProviderEvent) =>
            venueIds.get(keyOf(this.venueRow(event.venue), VENUE_KEY)) ?? null;

        // Building a row can throw (e.g. an unparseable date); keep that event
        // out of the bulk upsert so it cannot take the whole page down with it
        const candidates: { source: ProviderEvent; row: Row }[] = [];
        for (const event of events) {
            try {
                candidates.push({ source: event, row: this.eventRow(event, venueIdOf(event)) });
            } catch (error) {
                stats.errors.push(`Error syncing event ${event.id}: ${messageOf(error)}`);
            }
        }

        const entries = dedupe(candidates, EVENT_KEY);
        const { saved, failed } = await this.saveStage(
            'events',
            entries,
            EVENT_KEY,
            event => this.upsertEvent(event, venueIdOf(event))
        );

        stats.eventsCreated += saved.created;
        stats.eventsUpdated += saved.updated;
        for (const { source, error } of failed) {
            stats.errors.push(`Error syncing event ${source.id}: ${error}`);
        }

        const savedEvents: SavedEvent[] = [];
        for (const entry of entries) {
            const id = saved.ids.get(entry.key);
            if (id) {
                savedEvents.push({ event: entry.source, id });
            }
        }
        return savedEvents;
    }

    private async syncLinks(
        savedEvents: SavedEvent[],
        artistIds: Map<string, string>,
        stats: SyncStats
    ): Promise<void> {
        const links: { event: ProviderEvent; eventId: string; artistIds: string[] }[] = [];
        for (const { event, id } of savedEvents) {
            const ids = event.artists
                .map(artist => artistIds.get(keyOf(this.artistRow(artist), ARTIST_KEY)))
                .filter((artistId): artistId is string => artistId !== undefined);

            // An artist listed twice would give two rows with the same primary key
            const uniqueIds = [...new Set(ids)];
            if (uniqueIds.length > 0) {
                links.push({ event, eventId: id, artistIds: uniqueIds });
            }
        }

        if (links.length === 0) {
            return;
        }

        const rows = links.flatMap(link =>
            link.artistIds.map((artistId, i) => ({
                event_id: link.eventId,
                artist_id: artistId,
                billing_order: i + 1,
            }))
        );

        try {
            await this.supabase
                .from('event_artists')
                .upsert(rows, { onConflict: LINK_KEY.join(',') })
                .throwOnError();
            stats.eventArtistsLinked += rows.length;
            return;
        } catch (error) {
            console.error(`Batch upsert into event_artists failed, linking ${links.length} events one at a time:`, error);
        }

        for (const link of links) {
            try {
                stats.eventArtistsLinked += await this.linkEventArtists(link.eventId, link.artistIds);
            } catch (error) {
                stats.errors.push(`Error linking artists for event ${link.event.id}: ${messageOf(error)}`);
            }
        }
    }

    // Runs one bulk upsert for the stage, then saves any row it did not manage
    // to save (because the bulk upsert failed) one at a time with `saveOne`.
    private async saveStage<S>(
        table: string,
        entries: Entry<S>[],
        conflictColumns: string[],
        saveOne: (source: S) => Promise<SaveResult>
    ): Promise<{ saved: SavedRows; failed: { source: S; error: string }[] }> {
        const saved: SavedRows = { ids: new Map(), created: 0, updated: 0 };
        const failed: { source: S; error: string }[] = [];

        if (entries.length === 0) {
            return { saved, failed };
        }

        try {
            await this.saveBatch(table, entries.map(entry => entry.row), conflictColumns, saved);
        } catch (error) {
            console.error(`Batch upsert into ${table} failed:`, error);
        }

        const pending = entries.filter(entry => !saved.ids.has(entry.key));
        if (pending.length > 0) {
            console.warn(`Saving ${pending.length} of ${entries.length} ${table} rows one at a time`);
        }

        for (const entry of pending) {
            try {
                const result = await saveOne(entry.source);
                if (result.id) {
                    saved.ids.set(entry.key, result.id);
                    if (result.isNew) {
                        saved.created++;
                    } else {
                        saved.updated++;
                    }
                } else {
                    failed.push({ source: entry.source, error: result.error ?? 'row was not saved' });
                }
            } catch (error) {
                failed.push({ source: entry.source, error: messageOf(error) });
            }
        }

        return { saved, failed };
    }

    // Two upserts per table rather than one, because the response of a single
    // upsert cannot say which rows were inserted and which were merely updated:
    //  1. ON CONFLICT DO NOTHING returns only the rows it actually inserted, so
    //     that count is exactly "created" (the A15 fix in sprint 11).
    //  2. The rows that already existed are merged with ON CONFLICT DO UPDATE.
    // INSERT triggers (migration 013 notifications) fire only for real inserts,
    // so each new row still notifies exactly once; merging fires UPDATE triggers.
    // Progress is recorded in `saved` as it happens, so a failure in step 2 still
    // keeps the step 1 results and the caller only retries what is missing.
    private async saveBatch(
        table: string,
        rows: Row[],
        conflictColumns: string[],
        saved: SavedRows
    ): Promise<void> {
        const onConflict = conflictColumns.join(',');
        const returning = ['id', ...conflictColumns].join(',');

        const inserted = await this.upsertRows(table, rows, { onConflict, ignoreDuplicates: true }, returning);
        for (const row of inserted) {
            saved.ids.set(keyOf(row, conflictColumns), String(row.id));
        }
        saved.created += inserted.length;

        const existing = rows.filter(row => !saved.ids.has(keyOf(row, conflictColumns)));
        if (existing.length === 0) {
            return;
        }

        const merged = await this.upsertRows(table, existing, { onConflict }, returning);
        for (const row of merged) {
            saved.ids.set(keyOf(row, conflictColumns), String(row.id));
        }
        saved.updated += merged.length;
    }

    private async upsertRows(
        table: string,
        rows: Row[],
        options: { onConflict: string; ignoreDuplicates?: boolean },
        returning: string
    ): Promise<Row[]> {
        const { data } = await this.supabase
            .from(table)
            .upsert(rows, options)
            .select(returning)
            .throwOnError();

        return (data ?? []) as unknown as Row[];
    }
}
