import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketmasterClient } from './ticketmaster-client.js';
import { TicketmasterProvider } from './ticketmaster-provider.js';
import type { ProviderEvent } from './ticketmaster-provider.js';
import type { TmAttraction, TmEvent } from './types.js';

function tmEvent(overrides: Partial<TmEvent> = {}): TmEvent {
    return {
        id: 'Z7r9jZ1A7',
        name: 'Interpol',
        url: 'https://www.ticketmaster.com/event/Z7r9jZ1A7',
        dates: { start: { dateTime: '2026-12-01T01:00:00Z' } },
        _embedded: {
            venues: [{
                id: 'KovZpZA7AAEA',
                name: 'Kings Theatre',
                city: { name: 'Brooklyn' },
                country: { name: 'United States Of America', countryCode: 'US' },
                location: { latitude: '40.6461', longitude: '-73.9575' },
            }],
            attractions: [{ id: 'K8vZ917G7x0', name: 'Interpol' }],
        },
        ...overrides,
    };
}

function providerFor(events: TmEvent[]): TicketmasterProvider {
    const client = {
        searchEvents: async () => ({
            _embedded: { events },
            page: { size: 200, totalElements: events.length, totalPages: 1, number: 0 },
        }),
        searchEventsAll: async function* () {
            yield events;
        },
    };
    return new TicketmasterProvider(client as unknown as TicketmasterClient);
}

async function mapped(event: TmEvent): Promise<ProviderEvent[]> {
    const { events } = await providerFor([event]).searchEvents({});
    return events;
}

describe('TicketmasterProvider input cleaning', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('trims names and places so padded values do not create duplicate rows', async () => {
        const [event] = await mapped(tmEvent({
            name: '  Interpol: Live  ',
            _embedded: {
                venues: [{
                    id: 'KovZpZA7AAEA',
                    name: ' Kings Theatre ',
                    city: { name: 'Brooklyn ' },
                    country: { name: 'United States Of America', countryCode: ' US' },
                }],
                attractions: [{ id: 'K8vZ917G7x0', name: 'Interpol ' }],
            },
        }));

        expect(event.name).toBe('Interpol: Live');
        expect(event.venue).toMatchObject({ name: 'Kings Theatre', city: 'Brooklyn', country: 'US' });
        expect(event.artists.map(artist => artist.name)).toEqual(['Interpol']);
    });

    it('drops attractions without a usable name and keeps the rest in billing order', async () => {
        const [event] = await mapped(tmEvent({
            _embedded: {
                venues: tmEvent()._embedded?.venues,
                attractions: [
                    { id: 'A1', name: 'Interpol' },
                    { id: 'A2' } as TmAttraction,
                    { id: 'A3', name: '' },
                    { id: 'A4', name: '   ' },
                    { id: 'A5', name: 'Beach House' },
                ],
            },
        }));

        expect(event.artists.map(artist => artist.id)).toEqual(['A1', 'A5']);
    });

    it('falls back to Unknown when the city or country is blank', async () => {
        const [event] = await mapped(tmEvent({
            _embedded: {
                venues: [{ id: 'V1', name: 'Kings Theatre', city: { name: '  ' } }],
            },
        }));

        expect(event.venue).toMatchObject({ city: 'Unknown', country: 'Unknown' });
    });

    it('skips events whose own name or venue name is blank, as both columns are NOT NULL', async () => {
        const namelessEvent = tmEvent({ name: ' ' });
        const namelessVenue = tmEvent({
            _embedded: { venues: [{ id: 'V1', name: '' }], attractions: [] },
        });

        expect(await mapped(namelessEvent)).toEqual([]);
        expect(await mapped(namelessVenue)).toEqual([]);
    });

    it('cleans the events the nightly ingest fetches', async () => {
        const provider = providerFor([
            tmEvent({
                _embedded: {
                    venues: [{ id: 'V1', name: 'Kings Theatre', city: { name: 'Brooklyn ' } }],
                    attractions: [{ id: 'A2' } as TmAttraction],
                },
            }),
        ]);

        const pages: ProviderEvent[][] = [];
        for await (const page of provider.fetchAllEvents({
            countries: ['US'],
            cities: ['Brooklyn'],
            from: new Date('2026-10-04T00:00:00Z'),
            to: new Date('2027-04-02T00:00:00Z'),
        })) {
            pages.push(page);
        }

        expect(pages).toHaveLength(1);
        expect(pages[0][0].venue.city).toBe('Brooklyn');
        expect(pages[0][0].artists).toEqual([]);
    });
});

// ============================================
// Areas and date windows, against a fake Ticketmaster
// ============================================

interface FakeEvent {
    id: string;
    startAt: string;
    dmaId?: string;
    city?: string;
}

interface FakeRequest {
    dmaId: string | null;
    city: string | null;
    countryCode: string | null;
    classificationName: string | null;
    startDateTime: string;
    endDateTime: string;
    page: number;
    total: number;
}

// Answers /events.json the way the Discovery API does, including the
// deep-paging cap. Both date bounds are inclusive, the worst case for
// windows that share an edge.
function fakeTicketmaster(events: FakeEvent[]) {
    const requests: FakeRequest[] = [];

    const fetch = async (input: string | URL): Promise<Response> => {
        const params = new URL(String(input)).searchParams;
        const page = Number(params.get('page'));
        const size = Number(params.get('size'));
        if (page * size >= 1000) {
            return new Response('{"errors":[{"code":"DIS1035","detail":"API Limits Exceeded"}]}', { status: 400 });
        }

        const start = Date.parse(params.get('startDateTime') ?? '');
        const end = Date.parse(params.get('endDateTime') ?? '');
        const dmaId = params.get('dmaId');
        const city = params.get('city');
        const matches = events
            .filter(e => (!dmaId || e.dmaId === dmaId) && (!city || e.city === city))
            .filter(e => Date.parse(e.startAt) >= start && Date.parse(e.startAt) <= end)
            .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id));

        requests.push({
            dmaId,
            city,
            countryCode: params.get('countryCode'),
            classificationName: params.get('classificationName'),
            startDateTime: params.get('startDateTime') ?? '',
            endDateTime: params.get('endDateTime') ?? '',
            page,
            total: matches.length,
        });

        const slice = matches.slice(page * size, (page + 1) * size);
        return Response.json({
            ...(slice.length > 0 ? {
                _embedded: {
                    events: slice.map(e => tmEvent({
                        id: e.id,
                        dates: { start: { dateTime: e.startAt } },
                        _embedded: {
                            venues: [{ id: `V-${e.city ?? 'NYC'}`, name: 'Venue', city: { name: e.city ?? 'New York' } }],
                            attractions: [],
                        },
                    })),
                },
            } : {}),
            page: { size, totalElements: matches.length, totalPages: Math.ceil(matches.length / size), number: page },
        });
    };

    return { fetch, requests };
}

const FROM = new Date('2026-10-20T00:00:00Z');
const TO = new Date('2027-04-18T00:00:00Z');  // 180 days later

// `count` events spaced evenly from FROM to TO, on whole seconds
function spread(count: number, fields: Omit<FakeEvent, 'id' | 'startAt'> = {}): FakeEvent[] {
    const step = (TO.getTime() - FROM.getTime()) / count;
    const prefix = fields.dmaId ?? fields.city ?? 'US';
    return Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
        startAt: new Date(Math.floor((FROM.getTime() + i * step) / 1000) * 1000).toISOString(),
        ...fields,
    }));
}

describe('TicketmasterProvider.fetchAllEvents areas and windows', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function setup(events: FakeEvent[]) {
        const tm = fakeTicketmaster(events);
        vi.stubGlobal('fetch', tm.fetch);
        // A high rate limit keeps the client's throttle from slowing the tests
        const client = new TicketmasterClient('test-key', 'https://tm.test/discovery/v2', 1000);
        return { tm, client, provider: new TicketmasterProvider(client) };
    }

    async function idsFrom(provider: TicketmasterProvider, areas: { dmaIds?: string[]; cities?: string[] }) {
        const ids: string[] = [];
        for await (const page of provider.fetchAllEvents({ countries: ['US'], ...areas, from: FROM, to: TO })) {
            ids.push(...page.map(event => event.id));
        }
        return ids;
    }

    it('pages through a metro area that fits under the cap without splitting it', async () => {
        const { tm, client, provider } = setup(spread(450, { dmaId: '345' }));

        const ids = await idsFrom(provider, { dmaIds: ['345'] });

        expect(ids).toHaveLength(450);
        expect(tm.requests.map(r => r.page)).toEqual([0, 1, 2]);
        expect(tm.requests.every(r => r.dmaId === '345' && r.classificationName === 'music')).toBe(true);
        expect(client.requestCount).toBe(3);
    });

    it('splits a date range with more than 1,000 events until every window fits', async () => {
        // The first split falls exactly on 2027-01-18; an event there is in both halves
        const boundary = { id: 'boundary', startAt: '2027-01-18T00:00:00.000Z', dmaId: '345' };
        const events = [...spread(2500, { dmaId: '345' }), boundary];
        const { tm, provider } = setup(events);

        const ids = await idsFrom(provider, { dmaIds: ['345'] });

        expect(ids).toHaveLength(events.length);
        expect(new Set(ids)).toEqual(new Set(events.map(e => e.id)));
        expect(tm.requests[0]).toMatchObject({ page: 0, total: 2501 });
        // Only windows within the cap are paged past their first page
        expect(tm.requests.filter(r => r.page > 0).every(r => r.total <= 1000)).toBe(true);
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('takes the first 1,000 events of an hour-long window instead of splitting forever', async () => {
        const sameStart = Array.from({ length: 1200 }, (_, i) => ({
            id: `crowded-${i}`,
            startAt: '2026-12-01T20:00:00.000Z',
            dmaId: '345',
        }));
        const { tm, provider } = setup(sameStart);

        const ids = await idsFrom(provider, { dmaIds: ['345'] });

        expect(ids).toHaveLength(1000);
        expect(tm.requests.length).toBeLessThan(40);
        const paged = tm.requests.filter(r => r.page > 0);
        expect(paged.length).toBeGreaterThan(0);
        expect(paged.every(r => Date.parse(r.endDateTime) - Date.parse(r.startDateTime) <= 60 * 60 * 1000)).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('pagination cap reached'));
    });

    it('yields an event once when a metro area and a city both return it', async () => {
        const nyc = spread(300, { dmaId: '345' }).map((e, i) => (i % 3 === 0 ? { ...e, city: 'Brooklyn' } : e));
        const brooklynOnly = { id: 'brooklyn-only', startAt: '2026-11-05T01:00:00.000Z', city: 'Brooklyn' };
        const { provider } = setup([...nyc, brooklynOnly]);

        const ids = await idsFrom(provider, { dmaIds: ['345'], cities: ['Brooklyn'] });

        expect(ids).toHaveLength(301);
        expect(new Set(ids).size).toBe(301);
        expect(ids.at(-1)).toBe('brooklyn-only');
    });

    it('keeps country mode to one query per country, capped at 1,000 events', async () => {
        const { tm, provider } = setup(spread(1500));

        const ids = await idsFrom(provider, {});

        expect(ids).toHaveLength(1000);
        expect(tm.requests.map(r => r.page)).toEqual([0, 1, 2, 3, 4]);
        expect(tm.requests.every(r => r.countryCode === 'US' && r.dmaId === null)).toBe(true);
        expect(new Set(tm.requests.map(r => r.startDateTime)).size).toBe(1);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('pagination cap reached'));
    });
});
