import { describe, expect, it } from 'vitest'
import { shouldClearQueryCache } from './cache-policy'

describe('shouldClearQueryCache', () => {
    it('clears on SIGNED_OUT', () => {
        expect(shouldClearQueryCache('SIGNED_OUT', 'user-a', null)).toBe(true)
    })

    it('clears when the signed-in identity changes', () => {
        expect(shouldClearQueryCache('SIGNED_IN', 'user-a', 'user-b')).toBe(true)
    })

    it('clears when the session loses its user without a SIGNED_OUT event', () => {
        expect(shouldClearQueryCache('TOKEN_REFRESHED', 'user-a', null)).toBe(true)
    })

    it('does not clear on TOKEN_REFRESHED for the same user', () => {
        expect(shouldClearQueryCache('TOKEN_REFRESHED', 'user-a', 'user-a')).toBe(false)
    })

    it('does not clear on INITIAL_SESSION at startup', () => {
        expect(shouldClearQueryCache('INITIAL_SESSION', null, 'user-a')).toBe(false)
        expect(shouldClearQueryCache('INITIAL_SESSION', null, null)).toBe(false)
    })

    it('does not clear on first SIGNED_IN from a signed-out state', () => {
        expect(shouldClearQueryCache('SIGNED_IN', null, 'user-a')).toBe(false)
    })

    it('does not clear when SIGNED_IN re-fires for the same user', () => {
        expect(shouldClearQueryCache('SIGNED_IN', 'user-a', 'user-a')).toBe(false)
    })
})
