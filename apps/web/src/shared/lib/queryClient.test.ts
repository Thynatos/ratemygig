import { describe, expect, it } from 'vitest'
import { retryUnlessNotFound } from './queryClient'

describe('retryUnlessNotFound', () => {
    it('does not retry resolver "not found" errors', () => {
        expect(retryUnlessNotFound(0, new Error('Artist not found'))).toBe(false)
        expect(retryUnlessNotFound(0, new Error('Venue not found'))).toBe(false)
        expect(retryUnlessNotFound(0, new Error('Event not found'))).toBe(false)
        expect(retryUnlessNotFound(0, new Error('Song not found'))).toBe(false)
    })

    it('does not retry PostgREST PGRST116 (0 rows from .single())', () => {
        expect(retryUnlessNotFound(0, { code: 'PGRST116' })).toBe(false)
    })

    it('retries transient errors up to QUERY_DEFAULTS.RETRY', () => {
        expect(retryUnlessNotFound(0, new Error('network timeout'))).toBe(true)
        expect(retryUnlessNotFound(1, new Error('network timeout'))).toBe(true)
    })

    it('stops retrying transient errors after QUERY_DEFAULTS.RETRY', () => {
        expect(retryUnlessNotFound(2, new Error('network timeout'))).toBe(false)
        expect(retryUnlessNotFound(3, new Error('network timeout'))).toBe(false)
    })

    it('retries non-error throwables up to QUERY_DEFAULTS.RETRY', () => {
        expect(retryUnlessNotFound(0, 'string error')).toBe(true)
        expect(retryUnlessNotFound(1, undefined)).toBe(true)
        expect(retryUnlessNotFound(2, null)).toBe(false)
    })
})
