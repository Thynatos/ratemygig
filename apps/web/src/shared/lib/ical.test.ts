import { describe, expect, it } from 'vitest'
import { buildGoogleCalendarUrl, buildIcs } from './ical'
import type { IcalEventInput } from './ical'

const baseEvent: IcalEventInput = {
    id: 'evt-1',
    name: 'Taylor Swift Eras Tour',
    startAt: '2030-06-15T20:00:00.000Z',
    venueName: 'Wembley Stadium',
    city: 'London',
    ticketUrl: 'https://tickets.example.com/ts',
}

const fixedNow = new Date('2026-07-21T12:00:00.000Z')

describe('buildIcs', () => {
    it('produces a VCALENDAR wrapper with CRLF line endings', () => {
        const ics = buildIcs([baseEvent], { now: fixedNow })
        expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
        expect(ics).not.toMatch(/[^\r]\n/)
        expect(ics).toContain('VERSION:2.0')
        expect(ics).toContain('PRODID:-//ratemygig//RateMyGig//EN')
    })

    it('formats dates as UTC basic format', () => {
        const ics = buildIcs([baseEvent], { now: fixedNow })
        expect(ics).toContain('DTSTAMP:20260721T120000Z')
        expect(ics).toContain('DTSTART:20300615T200000Z')
    })

    it('defaults DTEND to start +3h', () => {
        const ics = buildIcs([baseEvent], { now: fixedNow })
        expect(ics).toContain('DTEND:20300615T230000Z')
    })

    it('accepts Date objects for startAt', () => {
        const ics = buildIcs([{ ...baseEvent, startAt: new Date('2030-06-15T20:00:00.000Z') }], { now: fixedNow })
        expect(ics).toContain('DTSTART:20300615T200000Z')
    })

    it('uses the event id and default domain in the UID', () => {
        const ics = buildIcs([baseEvent], { now: fixedNow })
        expect(ics).toContain('UID:evt-1@ratemygig')
    })

    it('uses a custom domain when provided', () => {
        const ics = buildIcs([baseEvent], { now: fixedNow, domain: 'gigs.example.com' })
        expect(ics).toContain('UID:evt-1@gigs.example.com')
        expect(ics).toContain('PRODID:-//gigs.example.com//RateMyGig//EN')
    })

    it('escapes TEXT special characters in SUMMARY and LOCATION', () => {
        const ics = buildIcs([{
            ...baseEvent,
            name: 'Rock, Paper; Scissors \\ Tour\nLive',
            venueName: 'The O2, Arena',
        }], { now: fixedNow })
        expect(ics).toContain('SUMMARY:Rock\\, Paper\\; Scissors \\\\ Tour\\nLive')
        expect(ics).toContain('LOCATION:The O2\\, Arena\\, London')
    })

    it('includes LOCATION, URL and DESCRIPTION from venue and ticket link', () => {
        const ics = buildIcs([baseEvent], { now: fixedNow })
        expect(ics).toContain('LOCATION:Wembley Stadium\\, London')
        expect(ics).toContain('URL:https://tickets.example.com/ts')
        expect(ics).toContain('DESCRIPTION:Tickets: https://tickets.example.com/ts')
    })

    it('omits LOCATION, URL and DESCRIPTION when fields are missing', () => {
        const ics = buildIcs([{ id: 'evt-2', name: 'Secret Show', startAt: baseEvent.startAt }], { now: fixedNow })
        expect(ics).not.toContain('LOCATION')
        expect(ics).not.toContain('URL:')
        expect(ics).not.toContain('DESCRIPTION')
    })

    it('emits one VEVENT per event', () => {
        const ics = buildIcs([
            baseEvent,
            { ...baseEvent, id: 'evt-2', name: 'Coldplay' },
        ], { now: fixedNow })
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
        expect(ics.match(/END:VEVENT/g)).toHaveLength(2)
        expect(ics).toContain('UID:evt-2@ratemygig')
    })

    it('folds lines longer than 75 octets with CRLF + single space', () => {
        const longName = 'A'.repeat(100)
        const ics = buildIcs([{ ...baseEvent, name: longName }], { now: fixedNow })
        const summaryStart = ics.indexOf('SUMMARY:')
        const summaryEnd = ics.indexOf('\r\nLOCATION')
        const summaryBlock = ics.slice(summaryStart, summaryEnd)
        expect(summaryBlock).toContain('\r\n ')
        for (const physicalLine of summaryBlock.split('\r\n')) {
            expect(new TextEncoder().encode(physicalLine).length).toBeLessThanOrEqual(75)
        }
    })

    it('keeps every physical line at or under 75 octets', () => {
        const ics = buildIcs([{
            ...baseEvent,
            name: 'Beyoncé Renaissance World Tour — The Final Édition Spéciale',
            ticketUrl: 'https://tickets.example.com/some/really/long/path?with=query&params=1',
        }], { now: fixedNow })
        for (const physicalLine of ics.split('\r\n')) {
            expect(new TextEncoder().encode(physicalLine).length).toBeLessThanOrEqual(75)
        }
    })

    it('handles an empty event list', () => {
        const ics = buildIcs([], { now: fixedNow })
        expect(ics).toBe(
            'BEGIN:VCALENDAR\r\n' +
            'VERSION:2.0\r\n' +
            'PRODID:-//ratemygig//RateMyGig//EN\r\n' +
            'CALSCALE:GREGORIAN\r\n' +
            'METHOD:PUBLISH\r\n' +
            'END:VCALENDAR\r\n'
        )
    })
})

describe('buildGoogleCalendarUrl', () => {
    it('builds a TEMPLATE url with text, dates, details and location', () => {
        const url = buildGoogleCalendarUrl(baseEvent)
        expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true)
        const params = new URL(url).searchParams
        expect(params.get('action')).toBe('TEMPLATE')
        expect(params.get('text')).toBe('Taylor Swift Eras Tour')
        expect(params.get('dates')).toBe('20300615T200000Z/20300615T230000Z')
        expect(params.get('details')).toBe('Tickets: https://tickets.example.com/ts')
        expect(params.get('location')).toBe('Wembley Stadium, London')
    })

    it('omits details and location when fields are missing', () => {
        const url = buildGoogleCalendarUrl({ id: 'evt-2', name: 'Secret Show', startAt: baseEvent.startAt })
        const params = new URL(url).searchParams
        expect(params.get('details')).toBeNull()
        expect(params.get('location')).toBeNull()
    })
})
