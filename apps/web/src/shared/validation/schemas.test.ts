import { describe, it, expect } from 'vitest'
import {
    emailSchema,
    profileSchema,
    reviewSchema,
    eventFiltersSchema,
    ratingFiltersSchema,
    attendanceSchema,
    ticketUrlSchema,
    yearStatsSchema,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE_MB,
    MAX_PHOTOS_PER_REVIEW,
} from './schemas'

describe('emailSchema', () => {
    it('accepts valid email', () => {
        const result = emailSchema.safeParse({ email: 'test@example.com' })
        expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
        const result = emailSchema.safeParse({ email: 'not-an-email' })
        expect(result.success).toBe(false)
    })

    it('rejects empty email', () => {
        const result = emailSchema.safeParse({ email: '' })
        expect(result.success).toBe(false)
    })
})

describe('profileSchema', () => {
    it('accepts valid profile', () => {
        const result = profileSchema.safeParse({
            username: 'john_doe',
            display_name: 'John Doe',
            bio: 'Music lover',
            is_profile_public: true,
        })
        expect(result.success).toBe(true)
    })

    it('rejects username that is too short', () => {
        const result = profileSchema.safeParse({
            username: 'ab',
            is_profile_public: true,
        })
        expect(result.success).toBe(false)
    })

    it('rejects username with invalid characters', () => {
        const result = profileSchema.safeParse({
            username: 'john-doe',
            is_profile_public: true,
        })
        expect(result.success).toBe(false)
    })

    it('accepts empty username', () => {
        const result = profileSchema.safeParse({
            username: '',
            is_profile_public: true,
        })
        expect(result.success).toBe(true)
    })

    it('rejects bio that is too long', () => {
        const result = profileSchema.safeParse({
            bio: 'a'.repeat(501),
            is_profile_public: true,
        })
        expect(result.success).toBe(false)
    })
})

describe('reviewSchema', () => {
    it('accepts valid review', () => {
        const result = reviewSchema.safeParse({
            rating: 4,
            title: 'Great show!',
            body: 'This was an amazing concert experience.',
            isPublic: true,
        })
        expect(result.success).toBe(true)
    })

    it('rejects rating out of range', () => {
        const result = reviewSchema.safeParse({
            rating: 6,
            body: 'This was good',
            isPublic: true,
        })
        expect(result.success).toBe(false)
    })

    it('rejects body that is too short', () => {
        const result = reviewSchema.safeParse({
            rating: 4,
            body: 'Short',
            isPublic: true,
        })
        expect(result.success).toBe(false)
    })

    it('accepts review without title', () => {
        const result = reviewSchema.safeParse({
            rating: 4,
            body: 'This was an amazing concert experience.',
            isPublic: false,
        })
        expect(result.success).toBe(true)
    })
})

describe('eventFiltersSchema', () => {
    it('accepts valid filters', () => {
        const result = eventFiltersSchema.safeParse({
            city: 'London',
            query: 'rock concert',
            page: 1,
            pageSize: 20,
        })
        expect(result.success).toBe(true)
    })

    it('accepts empty filters', () => {
        const result = eventFiltersSchema.safeParse({})
        expect(result.success).toBe(true)
    })

    it('rejects invalid page number', () => {
        const result = eventFiltersSchema.safeParse({
            page: 0,
        })
        expect(result.success).toBe(false)
    })

    it('rejects page size too large', () => {
        const result = eventFiltersSchema.safeParse({
            pageSize: 200,
        })
        expect(result.success).toBe(false)
    })
})

describe('ratingFiltersSchema', () => {
    it('accepts valid rating filters', () => {
        const result = ratingFiltersSchema.safeParse({
            city: 'New York',
            year: 2024,
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid year', () => {
        const result = ratingFiltersSchema.safeParse({
            year: 1999,
        })
        expect(result.success).toBe(false)
    })
})

describe('attendanceSchema', () => {
    it('accepts planned status', () => {
        const result = attendanceSchema.safeParse({
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'planned',
        })
        expect(result.success).toBe(true)
    })

    it('accepts attended status', () => {
        const result = attendanceSchema.safeParse({
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'attended',
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
        const result = attendanceSchema.safeParse({
            eventId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'maybe',
        })
        expect(result.success).toBe(false)
    })
})

describe('ticketUrlSchema', () => {
    it('accepts valid ticket URL', () => {
        const result = ticketUrlSchema.safeParse({
            label: 'Ticketmaster',
            url: 'https://ticketmaster.com/event/123',
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid URL', () => {
        const result = ticketUrlSchema.safeParse({
            label: 'Tickets',
            url: 'not-a-url',
        })
        expect(result.success).toBe(false)
    })

    it('rejects empty label', () => {
        const result = ticketUrlSchema.safeParse({
            label: '',
            url: 'https://example.com',
        })
        expect(result.success).toBe(false)
    })
})

describe('yearStatsSchema', () => {
    const fullRow = {
        gigs_attended: 12,
        reviews_written: 8,
        avg_rating_given: 4.2,
        photos_uploaded: 15,
        distinct_cities: 3,
        first_gig_date: '2026-02-01T19:00:00+00:00',
        last_gig_date: '2026-11-20T20:30:00+00:00',
        top_artists: [
            { name: 'Artist A', count: 4 },
            { name: 'Artist B', count: 2 },
        ],
        top_venues: [{ name: 'Venue X', count: 5 }],
    }

    it('parses a full valid RPC row', () => {
        expect(yearStatsSchema.safeParse(fullRow).success).toBe(true)
    })

    it('parses a zero-data row with null dates and empty lists', () => {
        const result = yearStatsSchema.safeParse({
            gigs_attended: 0,
            reviews_written: 0,
            avg_rating_given: 0,
            photos_uploaded: 0,
            distinct_cities: 0,
            first_gig_date: null,
            last_gig_date: null,
            top_artists: [],
            top_venues: [],
        })
        expect(result.success).toBe(true)
    })

    it('rejects a row where a stat entry misses count', () => {
        const result = yearStatsSchema.safeParse({
            ...fullRow,
            top_artists: [{ name: 'Artist A' }],
        })
        expect(result.success).toBe(false)
    })

    it('rejects a numeric-string avg_rating (PostgREST numeric leak guard)', () => {
        const result = yearStatsSchema.safeParse({ ...fullRow, avg_rating_given: '4.2' })
        expect(result.success).toBe(false)
    })
})

describe('Constants', () => {
    it('has correct allowed image types', () => {
        expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg')
        expect(ALLOWED_IMAGE_TYPES).toContain('image/png')
        expect(ALLOWED_IMAGE_TYPES).toContain('image/webp')
    })

    it('has reasonable max image size', () => {
        expect(MAX_IMAGE_SIZE_MB).toBe(10)
    })

    it('has reasonable max photos per review', () => {
        expect(MAX_PHOTOS_PER_REVIEW).toBe(10)
    })
})
