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

export class SyncService {
    private supabase: SupabaseClient;
    private provider: string;

    constructor(supabaseUrl: string, serviceRoleKey: string, provider: string = 'ticketmaster') {
        this.supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
        });
        this.provider = provider;
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

        const venueData = {
            name: venue.name,
            city: venue.city,
            country: venue.country,
            lat: venue.lat || null,
            lng: venue.lng || null,
            provider_venue_id: venue.id,
        };

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

        const artistData = {
            name: artist.name,
            provider_artist_id: artist.id,
            image_url: artist.imageUrl || null,
        };

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

    async upsertEvent(event: ProviderEvent, venueId: string | null): Promise<{ id: string | null; isNew: boolean }> {
        // Check if event exists
        const { data: existing } = await this.supabase
            .from('events')
            .select('id')
            .eq('provider', this.provider)
            .eq('provider_event_id', event.id)
            .single();

        const eventData = {
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
                return { id: null, isNew: false };
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
                return { id: null, isNew: false };
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

            if (!error) {
                linked++;
            }
        }

        return linked;
    }

    // ============================================
    // Batch Sync
    // ============================================

    async syncEvents(events: ProviderEvent[]): Promise<SyncStats> {
        const stats: SyncStats = {
            eventsCreated: 0,
            eventsUpdated: 0,
            venuesCreated: 0,
            artistsCreated: 0,
            eventArtistsLinked: 0,
            errors: [],
        };

        const venueCache = new Map<string, string>();  // providerVenueId -> dbVenueId
        const artistCache = new Map<string, string>(); // providerArtistId -> dbArtistId

        for (const event of events) {
            try {
                // 1. Sync venue
                let venueId = venueCache.get(event.venue.id);
                if (!venueId) {
                    const venue = await this.upsertVenue(event.venue);
                    if (venue.id) {
                        venueCache.set(event.venue.id, venue.id);
                        if (venue.isNew) {
                            stats.venuesCreated++;
                        }
                        venueId = venue.id;
                    }
                }

                // 2. Sync artists
                const artistIds: string[] = [];
                for (const artist of event.artists) {
                    let artistId = artistCache.get(artist.id);
                    if (!artistId) {
                        const syncedArtist = await this.upsertArtist(artist);
                        if (syncedArtist.id) {
                            artistCache.set(artist.id, syncedArtist.id);
                            if (syncedArtist.isNew) {
                                stats.artistsCreated++;
                            }
                            artistId = syncedArtist.id;
                        }
                    }
                    if (artistId) {
                        artistIds.push(artistId);
                    }
                }

                // 3. Sync event
                const { id: eventId, isNew } = await this.upsertEvent(event, venueId || null);
                if (eventId) {
                    if (isNew) {
                        stats.eventsCreated++;
                    } else {
                        stats.eventsUpdated++;
                    }

                    // 4. Link event to artists
                    if (artistIds.length > 0) {
                        const linked = await this.linkEventArtists(eventId, artistIds);
                        stats.eventArtistsLinked += linked;
                    }
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                stats.errors.push(`Error syncing event ${event.id}: ${errorMsg}`);
            }
        }

        return stats;
    }
}
