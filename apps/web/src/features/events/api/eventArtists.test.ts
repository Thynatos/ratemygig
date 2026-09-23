import { describe, expect, it } from 'vitest'
import { eventArtistKeys, mapEventArtistRows } from './eventArtists'

describe('eventArtistKeys', () => {
    it('generates all key', () => {
        expect(eventArtistKeys.all).toEqual(['event-artists'])
    })

    it('generates byEvent key', () => {
        expect(eventArtistKeys.byEvent('event-1')).toEqual(['event-artists', 'event-1'])
    })
})

describe('mapEventArtistRows', () => {
    it('keeps billing order and drops rows whose artist is missing', () => {
        expect(
            mapEventArtistRows([
                { billing_order: 1, artist: { id: 'a1', name: 'Headliner' } },
                { billing_order: 2, artist: null },
                { billing_order: 3, artist: { id: 'a3', name: 'Opener' } },
            ])
        ).toEqual([
            { id: 'a1', name: 'Headliner' },
            { id: 'a3', name: 'Opener' },
        ])
    })

    it('accepts the array form of the embed', () => {
        expect(mapEventArtistRows([{ billing_order: null, artist: [{ id: 'a1', name: 'Solo' }] }])).toEqual([
            { id: 'a1', name: 'Solo' },
        ])
    })
})
