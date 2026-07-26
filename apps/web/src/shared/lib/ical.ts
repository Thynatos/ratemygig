export interface IcalEventInput {
    id: string
    name: string
    startAt: string | Date
    venueName?: string | null
    city?: string | null
    ticketUrl?: string | null
}

export interface BuildIcsOptions {
    domain?: string
    now?: Date
}

const DEFAULT_DOMAIN = 'ratemygig'
const DEFAULT_DURATION_HOURS = 3
const MAX_LINE_OCTETS = 75

function toDate(value: string | Date): Date {
    return typeof value === 'string' ? new Date(value) : value
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function formatUtcDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n')
}

function foldLine(line: string): string {
    const encoder = new TextEncoder()
    const parts: string[] = []
    let current = ''
    for (const char of line) {
        const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1
        if (current && encoder.encode(current + char).length > limit) {
            parts.push(current)
            current = char
        } else {
            current += char
        }
    }
    parts.push(current)
    return parts.join('\r\n ')
}

export function buildIcs(events: IcalEventInput[], options: BuildIcsOptions = {}): string {
    const domain = options.domain ?? DEFAULT_DOMAIN
    const now = options.now ?? new Date()

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//${domain}//RateMyGig//EN`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ]

    for (const event of events) {
        const start = toDate(event.startAt)
        const end = addHours(start, DEFAULT_DURATION_HOURS)
        const location = [event.venueName, event.city].filter(Boolean).join(', ')

        lines.push('BEGIN:VEVENT')
        lines.push(`UID:${event.id}@${domain}`)
        lines.push(`DTSTAMP:${formatUtcDate(now)}`)
        lines.push(`DTSTART:${formatUtcDate(start)}`)
        lines.push(`DTEND:${formatUtcDate(end)}`)
        lines.push(`SUMMARY:${escapeText(event.name)}`)
        if (location) {
            lines.push(`LOCATION:${escapeText(location)}`)
        }
        if (event.ticketUrl) {
            lines.push(`URL:${event.ticketUrl}`)
            lines.push(`DESCRIPTION:Tickets: ${escapeText(event.ticketUrl)}`)
        }
        lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    return lines.map(foldLine).join('\r\n') + '\r\n'
}

export function buildGoogleCalendarUrl(event: IcalEventInput): string {
    const start = toDate(event.startAt)
    const end = addHours(start, DEFAULT_DURATION_HOURS)
    const location = [event.venueName, event.city].filter(Boolean).join(', ')

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.name,
        dates: `${formatUtcDate(start)}/${formatUtcDate(end)}`,
    })
    if (event.ticketUrl) {
        params.set('details', `Tickets: ${event.ticketUrl}`)
    }
    if (location) {
        params.set('location', location)
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}
