import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TicketmasterClient } from './ticketmaster-client.js';
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
