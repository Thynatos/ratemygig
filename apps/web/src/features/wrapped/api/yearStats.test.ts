import { describe, it, expect } from 'vitest'
import { resolveWrappedYear, MIN_WRAPPED_YEAR } from './yearStats'
import { yearStatsSchema } from '@/shared/validation/schemas'

describe('resolveWrappedYear', () => {
    it('returns a valid param as-is outside January', () => {
        expect(resolveWrappedYear('2025', new Date('2026-08-21T12:00:00Z'))).toBe(2025)
    })

    it('prefers a valid param over the January default', () => {
        expect(resolveWrappedYear('2024', new Date('2026-01-15T12:00:00Z'))).toBe(2024)
    })

    it('defaults to current year outside January', () => {
        expect(resolveWrappedYear(null, new Date('2026-08-21T12:00:00Z'))).toBe(2026)
    })

    it('defaults to previous year in January', () => {
        expect(resolveWrappedYear(null, new Date('2026-01-15T12:00:00Z'))).toBe(2025)
    })

    it('rejects non-numeric params', () => {
        expect(resolveWrappedYear('abc', new Date('2026-08-21T12:00:00Z'))).toBe(2026)
    })

    it('rejects years below the minimum', () => {
        expect(resolveWrappedYear(String(MIN_WRAPPED_YEAR - 1), new Date('2026-08-21T12:00:00Z'))).toBe(2026)
    })

    it('rejects future years', () => {
        expect(resolveWrappedYear('2027', new Date('2026-08-21T12:00:00Z'))).toBe(2026)
    })

    it('rejects partial matches like "2026abc"', () => {
        expect(resolveWrappedYear('2026abc', new Date('2026-08-21T12:00:00Z'))).toBe(2026)
    })
})

describe('yearStatsSchema guard', () => {
    const validRow = {
        gigs_attended: 3,
        reviews_written: 2,
        avg_rating_given: 4.5,
        photos_uploaded: 1,
        distinct_cities: 2,
        first_gig_date: '2026-06-15T20:00:00+00:00',
        last_gig_date: null,
        top_artists: [{ name: 'Band A', count: 2 }],
        top_venues: [],
    }

    it('accepts a well-formed row', () => {
        expect(yearStatsSchema.safeParse(validRow).success).toBe(true)
    })

    it('rejects avg_rating_given as a string', () => {
        expect(yearStatsSchema.safeParse({ ...validRow, avg_rating_given: '4.5' }).success).toBe(false)
    })
})
