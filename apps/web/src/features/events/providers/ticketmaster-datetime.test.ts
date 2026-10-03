import { describe, expect, it } from 'vitest'
import { toTicketmasterDateTime } from '../../../../../../packages/jobs/src/ticketmaster/datetime'

// The ingest job and live Ticketmaster search both build Discovery API date
// params with this helper; the API answers DIS1015 to any millisecond part.

describe('toTicketmasterDateTime', () => {
    it('drops milliseconds, which the Discovery API rejects', () => {
        expect(toTicketmasterDateTime(new Date('2026-09-24T16:47:26.972Z'))).toBe('2026-09-24T16:47:26Z')
    })

    it('leaves whole-second timestamps unchanged', () => {
        expect(toTicketmasterDateTime(new Date('2026-09-24T16:47:26.000Z'))).toBe('2026-09-24T16:47:26Z')
    })

    it('always produces the documented YYYY-MM-DDTHH:mm:ssZ shape', () => {
        expect(toTicketmasterDateTime(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    })

    it('passes an absent date through', () => {
        expect(toTicketmasterDateTime(undefined)).toBeUndefined()
    })
})
