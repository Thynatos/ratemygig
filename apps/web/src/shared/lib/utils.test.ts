import { describe, it, expect } from 'vitest'
import {
    cn,
    formatDate,
    getInitials,
    truncate,
    formatNumber,
    calculateAverageRating,
    isValidUrl,
    generateId,
    formatRelativeTime,
    getCityDisplayName,
    getRatingColor,
} from './utils'

describe('cn (classname utility)', () => {
    it('merges class names correctly', () => {
        expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes with falsy values', () => {
        expect(cn('base', undefined, 'visible')).toBe('base visible')
    })

    it('handles undefined/null values', () => {
        expect(cn('base', undefined, null)).toBe('base')
    })
})

describe('formatDate', () => {
    it('formats date with default format', () => {
        const date = '2024-06-15T20:00:00Z'
        const result = formatDate(date)
        expect(result).toBeTruthy()
    })

    it('formats date with custom format', () => {
        const date = '2024-06-15T20:00:00Z'
        const result = formatDate(date, 'yyyy')
        expect(result).toBe('2024')
    })

    it('handles Date objects', () => {
        const date = new Date(2024, 5, 15, 20, 0, 0)
        const result = formatDate(date, 'MMM d')
        expect(result).toContain('15')
    })
})

describe('getInitials', () => {
    it('returns initials from full name', () => {
        expect(getInitials('John Doe')).toBe('JD')
    })

    it('returns single initial from single name', () => {
        expect(getInitials('John')).toBe('J')
    })

    it('handles empty string', () => {
        expect(getInitials('')).toBe('?')
    })

    it('handles undefined', () => {
        expect(getInitials(undefined)).toBe('?')
    })

    it('limits to 2 characters', () => {
        expect(getInitials('John Michael Doe')).toBe('JM')
    })
})

describe('truncate', () => {
    it('truncates text longer than limit', () => {
        const text = 'This is a very long text'
        expect(truncate(text, 13)).toBe('This is a ...')
    })

    it('does not truncate text shorter than limit', () => {
        const text = 'Short'
        expect(truncate(text, 10)).toBe('Short')
    })

    it('handles exact length', () => {
        const text = '1234567890'
        expect(truncate(text, 10)).toBe('1234567890')
    })
})

describe('formatNumber', () => {
    it('formats thousands', () => {
        expect(formatNumber(1234)).toBe('1,234')
    })

    it('formats millions', () => {
        expect(formatNumber(1234567)).toBe('1,234,567')
    })
})

describe('calculateAverageRating', () => {
    it('calculates average correctly', () => {
        expect(calculateAverageRating([4, 5, 3, 4])).toBe(4)
    })

    it('returns 0 for empty array', () => {
        expect(calculateAverageRating([])).toBe(0)
    })

    it('handles single rating', () => {
        expect(calculateAverageRating([5])).toBe(5)
    })
})

describe('isValidUrl', () => {
    it('validates http URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('validates https URLs', () => {
        expect(isValidUrl('https://example.com/path?query=1')).toBe(true)
    })

    it('rejects invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false)
    })

    it('rejects empty strings', () => {
        expect(isValidUrl('')).toBe(false)
    })
})

describe('generateId', () => {
    it('generates valid UUID format', () => {
        const uuid = generateId()
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(uuid).toMatch(uuidRegex)
    })

    it('generates unique values', () => {
        const uuid1 = generateId()
        const uuid2 = generateId()
        expect(uuid1).not.toBe(uuid2)
    })
})

describe('formatRelativeTime', () => {
    it('formats recent time as just now', () => {
        const now = new Date().toISOString()
        const result = formatRelativeTime(now)
        expect(result).toMatch(/less than a minute ago|seconds? ago/)
    })
})

describe('getCityDisplayName', () => {
    it('formats city and country', () => {
        expect(getCityDisplayName('London', 'UK')).toBe('London, UK')
    })

    it('handles missing country', () => {
        expect(getCityDisplayName('London')).toBe('London')
    })
})

describe('getRatingColor', () => {
    it('returns green color for high ratings', () => {
        expect(getRatingColor(5)).toContain('green')
    })

    it('returns yellow color for medium ratings', () => {
        expect(getRatingColor(3)).toContain('yellow')
    })

    it('returns red color for low ratings', () => {
        expect(getRatingColor(1)).toContain('red')
    })
})
