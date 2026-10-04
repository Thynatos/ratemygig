import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketmasterProvider } from '../ticketmaster/index.js';
import type {
    ProviderArtist,
    ProviderEvent,
    ProviderVenue,
    TicketmasterClient,
    TmAttraction,
    TmEvent,
} from '../ticketmaster/index.js';
import { FakeSupabase } from './fake-supabase.js';
import type { Row } from './fake-supabase.js';
import { SyncService } from './sync-service.js';

const slug = (name: string) => name.toLowerCase().replace(/\W+/g, '-');

function venue(name: string, overrides: Partial<ProviderVenue> = {}): ProviderVenue {
    return { id: `tm-${slug(name)}`, name, city: 'New York', country: 'US', lat: 40.75, lng: -73.99, ...overrides };
}

function artist(name: string, overrides: Partial<ProviderArtist> = {}): ProviderArtist {
    return { id: `attr-${slug(name)}`, name, imageUrl: `https://img.example/${slug(name)}.jpg`, ...overrides };
}

function event(
    id: string,
    at: ProviderVenue,
    artists: ProviderArtist[],
    overrides: Partial<ProviderEvent> = {}
): ProviderEvent {
    return {
        id,
        name: `Show ${id}`,
        startAt: new Date('2026-12-01T20:00:00Z'),
        venue: at,
        artists,
        ticketUrls: [{ label: 'Ticketmaster', url: `https://tm.example/${id}` }],
        imageUrl: `https://img.example/${id}.jpg`,
        ...overrides,
    };
}

const garden = venue('Madison Square Garden');
const steel = venue('Brooklyn Steel', { city: 'Brooklyn' });
const strokes = artist('The Strokes');
const interpol = artist('Interpol');
const beachHouse = artist('Beach House');

function page(): ProviderEvent[] {
    return [
        event('e1', garden, [strokes, interpol]),
        event('e2', garden, [strokes]),
        event('e3', steel, [beachHouse]),
    ];
}

function only(rows: Row[], predicate: (row: Row) => boolean): Row {
    const matches = rows.filter(predicate);
    expect(matches).toHaveLength(1);
    return matches[0];
}

let fake: FakeSupabase;
let service: SyncService;

const idOf = (table: string, name: string) => only(fake.rows(table), row => row.name === name).id;
const eventRow = (providerEventId: string) =>
    only(fake.rows('events'), row => row.provider_event_id === providerEventId);

beforeEach(() => {
    fake = new FakeSupabase();
    service = new SyncService('http://unused.invalid', 'unused', 'ticketmaster', fake.client());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('SyncService.syncEvents batching', () => {
    it('saves a page of new events with one bulk upsert per table', async () => {
        const stats = await service.syncEvents(page());

        expect(stats).toEqual({
            eventsCreated: 3,
            eventsUpdated: 0,
            venuesCreated: 2,
            artistsCreated: 3,
            eventArtistsLinked: 4,
            errors: [],
        });
        expect(fake.calls.map(call => `${call.table}:${call.op}`)).toEqual([
            'venues:upsert',
            'artists:upsert',
            'events:upsert',
            'event_artists:upsert',
        ]);
    });

    it('upserts on the columns of each table\'s unique constraint', async () => {
        await service.syncEvents(page());

        expect(fake.calls.map(call => [call.table, call.onConflict, call.ignoreDuplicates])).toEqual([
            ['venues', 'name,city,country', true],
            ['artists', 'name', true],
            ['events', 'provider,provider_event_id', true],
            ['event_artists', 'event_id,artist_id', undefined],
        ]);
    });

    it('links each event to its venue and to its artists in billing order', async () => {
        await service.syncEvents(page());

        const e1 = eventRow('e1');
        expect(e1).toMatchObject({
            provider: 'ticketmaster',
            name: 'Show e1',
            start_at: '2026-12-01T20:00:00.000Z',
            city: 'New York',
            country: 'US',
            venue_id: idOf('venues', 'Madison Square Garden'),
            lineup: ['The Strokes', 'Interpol'],
            ticket_urls: [{ label: 'Ticketmaster', url: 'https://tm.example/e1' }],
        });
        expect(eventRow('e3').venue_id).toBe(idOf('venues', 'Brooklyn Steel'));
        expect(fake.rows('event_artists').filter(row => row.event_id === e1.id)).toEqual([
            { event_id: e1.id, artist_id: idOf('artists', 'The Strokes'), billing_order: 1 },
            { event_id: e1.id, artist_id: idOf('artists', 'Interpol'), billing_order: 2 },
        ]);
    });

    it('deduplicates rows that share a database key, so no upsert repeats a conflict key', async () => {
        const gardenAgain = venue('Madison Square Garden', { id: 'tm-garden-2' });
        const strokesAgain = artist('The Strokes', { id: 'attr-strokes-2' });
        const repetitive = [
            event('e1', garden, [strokes, strokesAgain, interpol]),
            event('e1', garden, [strokes, interpol]),
            event('e2', gardenAgain, [strokesAgain]),
        ];

        const first = await service.syncEvents(repetitive);
        fake.resetCalls();
        const second = await service.syncEvents(repetitive);

        expect(first).toEqual({
            eventsCreated: 2,
            eventsUpdated: 0,
            venuesCreated: 1,
            artistsCreated: 2,
            eventArtistsLinked: 3,
            errors: [],
        });
        expect(second).toEqual({
            eventsCreated: 0,
            eventsUpdated: 2,
            venuesCreated: 0,
            artistsCreated: 0,
            eventArtistsLinked: 3,
            errors: [],
        });
        expect(fake.calls.every(call => call.op === 'upsert')).toBe(true);
        expect(fake.calls.filter(call => !call.ignoreDuplicates).map(call => [call.table, call.rows.length])).toEqual([
            ['venues', 1],
            ['artists', 2],
            ['events', 2],
            ['event_artists', 3],
        ]);
    });

    it('reports only real inserts as created, so re-ingesting a page creates nothing', async () => {
        const first = await service.syncEvents(page());
        const second = await service.syncEvents(page());

        expect(first).toMatchObject({ eventsCreated: 3, venuesCreated: 2, artistsCreated: 3 });
        expect(second).toEqual({
            eventsCreated: 0,
            eventsUpdated: 3,
            venuesCreated: 0,
            artistsCreated: 0,
            eventArtistsLinked: 4,
            errors: [],
        });
    });

    it('counts only the new rows when a page mixes new and existing ones', async () => {
        await service.syncEvents(page());

        const stats = await service.syncEvents([
            ...page(),
            event('e4', venue('Terminal 5'), [artist('Phoenix'), strokes]),
        ]);

        expect(stats).toEqual({
            eventsCreated: 1,
            eventsUpdated: 3,
            venuesCreated: 1,
            artistsCreated: 1,
            eventArtistsLinked: 6,
            errors: [],
        });
    });

    it('fires the notification insert triggers exactly once per new event and link', async () => {
        await service.syncEvents(page());
        await service.syncEvents(page());
        await service.syncEvents([...page(), event('e4', garden, [strokes, artist('Phoenix')])]);

        expect(fake.insertTriggerFires.events).toBe(4);
        expect(fake.insertTriggerFires.event_artists).toBe(6);
        expect(fake.rows('event_artists')).toHaveLength(6);
    });

    it('refreshes existing rows with the latest Ticketmaster data', async () => {
        await service.syncEvents(page());
        const before = eventRow('e1');

        await service.syncEvents([
            event('e1', garden, [interpol, strokes], {
                name: 'Show e1 (moved)',
                startAt: new Date('2027-01-15T20:00:00Z'),
                ticketUrls: [],
            }),
        ]);

        const after = eventRow('e1');
        expect(after).toMatchObject({
            id: before.id,
            created_at: before.created_at,
            name: 'Show e1 (moved)',
            start_at: '2027-01-15T20:00:00.000Z',
            ticket_urls: [],
            lineup: ['Interpol', 'The Strokes'],
        });
        expect(after.updated_at).not.toBe(before.updated_at);

        const billing = fake.rows('event_artists')
            .filter(row => row.event_id === before.id)
            .map(row => [row.artist_id, row.billing_order]);
        expect(Object.fromEntries(billing)).toEqual({
            [String(idOf('artists', 'Interpol'))]: 1,
            [String(idOf('artists', 'The Strokes'))]: 2,
        });
    });

    it('sends the same keys on every row of a bulk upsert, so nothing is silently nulled', async () => {
        await service.syncEvents([
            event('e1', garden, [strokes]),
            event('e2', venue('Bare Room', { lat: undefined, lng: undefined }), [artist('No Image', { imageUrl: undefined })], {
                imageUrl: undefined,
                ticketUrls: [],
            }),
        ]);

        const bulk = fake.calls.filter(call => call.op === 'upsert');
        expect(bulk).toHaveLength(4);
        for (const call of bulk) {
            for (const row of call.rows) {
                expect(Object.keys(row).sort()).toEqual([...call.columns].sort());
            }
        }
        expect(only(fake.rows('venues'), row => row.name === 'Bare Room')).toMatchObject({ lat: null, lng: null });
        expect(only(fake.rows('artists'), row => row.name === 'No Image')).toMatchObject({ image_url: null });
    });

    it('skips the artist and link upserts when no event has artists', async () => {
        const stats = await service.syncEvents([event('e1', garden, [])]);

        expect(fake.calls.map(call => call.table)).toEqual(['venues', 'events']);
        expect(stats).toMatchObject({ eventsCreated: 1, eventArtistsLinked: 0, errors: [] });
    });

    it('does nothing for an empty page', async () => {
        const stats = await service.syncEvents([]);

        expect(stats).toEqual({
            eventsCreated: 0,
            eventsUpdated: 0,
            venuesCreated: 0,
            artistsCreated: 0,
            eventArtistsLinked: 0,
            errors: [],
        });
        expect(fake.calls).toEqual([]);
    });
});

describe('SyncService.syncEvents fallback', () => {
    it('saves the page row by row with accurate counts when every bulk upsert fails', async () => {
        await service.syncEvents(page());
        fake.failWhen(call => call.op === 'upsert' && call.rows.length > 1);

        const stats = await service.syncEvents([
            ...page(),
            event('e4', venue('Terminal 5'), [artist('Phoenix'), strokes]),
        ]);

        expect(stats).toEqual({
            eventsCreated: 1,
            eventsUpdated: 3,
            venuesCreated: 1,
            artistsCreated: 1,
            eventArtistsLinked: 6,
            errors: [],
        });
        expect(fake.insertTriggerFires.events).toBe(4);
        expect(fake.insertTriggerFires.event_artists).toBe(6);
    });

    it('falls back only for the stage that failed; later stages stay batched', async () => {
        fake.failWhen(call => call.table === 'venues' && call.op === 'upsert');

        const stats = await service.syncEvents(page());

        expect(stats).toEqual({
            eventsCreated: 3,
            eventsUpdated: 0,
            venuesCreated: 2,
            artistsCreated: 3,
            eventArtistsLinked: 4,
            errors: [],
        });
        expect(fake.calls.filter(call => call.table === 'venues').map(call => call.op)).toEqual([
            'upsert',
            'select',
            'insert',
            'select',
            'insert',
        ]);
        expect(fake.calls.filter(call => call.table !== 'venues').every(call => call.op === 'upsert')).toBe(true);
        expect(eventRow('e1').venue_id).toBe(idOf('venues', 'Madison Square Garden'));
    });

    it('isolates an event the database rejects instead of dropping the page', async () => {
        const rejected = event('e-bad', garden, [strokes], { name: undefined as unknown as string });

        const stats = await service.syncEvents([event('e1', garden, [strokes]), rejected, event('e3', steel, [beachHouse])]);

        expect(stats).toMatchObject({ eventsCreated: 2, eventsUpdated: 0, eventArtistsLinked: 2 });
        expect(stats.errors).toEqual([
            expect.stringMatching(/^Error syncing event e-bad: null value in column "name"/),
        ]);
        expect(fake.rows('events').map(row => row.provider_event_id)).toEqual(['e1', 'e3']);
    });

    it('records an event whose row cannot be built and saves the others in bulk', async () => {
        const undated = event('e-date', garden, [strokes], { startAt: new Date('not a date') });

        const stats = await service.syncEvents([event('e1', garden, [strokes]), undated]);

        expect(stats.eventsCreated).toBe(1);
        expect(stats.errors).toEqual(['Error syncing event e-date: Invalid time value']);
        expect(fake.calls.every(call => call.op === 'upsert')).toBe(true);
    });

    it('keeps the created count when only the merge step of a bulk upsert fails', async () => {
        await service.syncEvents(page());
        fake.failWhen(call => call.table === 'events' && call.op === 'upsert' && !call.ignoreDuplicates);

        const stats = await service.syncEvents([...page(), event('e4', garden, [strokes])]);

        expect(stats).toMatchObject({ eventsCreated: 1, eventsUpdated: 3, errors: [] });
        expect(fake.calls.filter(call => call.table === 'events' && call.op === 'update')).toHaveLength(3);
        expect(fake.insertTriggerFires.events).toBe(4);
    });

    it('links artists one at a time when the bulk link upsert fails', async () => {
        fake.failWhen(call => call.table === 'event_artists' && call.rows.length > 1);

        const stats = await service.syncEvents(page());

        expect(stats).toMatchObject({ eventArtistsLinked: 4, errors: [] });
        expect(fake.rows('event_artists')).toHaveLength(4);
    });

    it('loses only a nameless artist that reaches the service, never its event', async () => {
        const nameless = artist('placeholder', { name: undefined as unknown as string });

        const stats = await service.syncEvents([event('e1', garden, [strokes, nameless]), event('e3', steel, [beachHouse])]);

        expect(stats).toMatchObject({ eventsCreated: 2, artistsCreated: 2, eventArtistsLinked: 2, errors: [] });
        expect(fake.rows('artists').map(row => row.name)).toEqual(['The Strokes', 'Beach House']);
    });

    it('counts every event it could not save, so the ingest error threshold can trip', async () => {
        fake.failWhen(call => call.table === 'events' && call.op !== 'select');
        const events = ['e1', 'e2', 'e3', 'e4', 'e5'].map(id => event(id, garden, [strokes]));

        const stats = await service.syncEvents(events);

        expect(stats.eventsCreated).toBe(0);
        expect(stats.errors).toHaveLength(5);
        expect(fake.calls.some(call => call.table === 'event_artists')).toBe(false);
    });
});

describe('SyncService with TicketmasterProvider', () => {
    it('never sends a nameless Ticketmaster attraction to the database', async () => {
        const raw: TmEvent = {
            id: 'Z7r9jZ1A7',
            name: 'Interpol',
            dates: { start: { dateTime: '2026-12-01T01:00:00Z' } },
            _embedded: {
                venues: [{ id: 'KovZpZA7AAEA', name: 'Kings Theatre', city: { name: 'Brooklyn ' } }],
                attractions: [{ id: 'K8vZ917G7x0', name: 'Interpol' }, { id: 'K8vZ9171ob7' } as TmAttraction],
            },
        };
        const client = {
            searchEvents: async () => ({
                _embedded: { events: [raw] },
                page: { size: 200, totalElements: 1, totalPages: 1, number: 0 },
            }),
        };
        const { events } = await new TicketmasterProvider(client as unknown as TicketmasterClient).searchEvents({});

        const stats = await service.syncEvents(events);

        expect(stats).toMatchObject({ eventsCreated: 1, artistsCreated: 1, eventArtistsLinked: 1, errors: [] });
        expect(fake.calls.every(call => call.op === 'upsert')).toBe(true);
        expect(fake.rows('artists').map(row => row.name)).toEqual(['Interpol']);
        expect(fake.rows('venues')).toEqual([expect.objectContaining({ name: 'Kings Theatre', city: 'Brooklyn' })]);
    });
});
