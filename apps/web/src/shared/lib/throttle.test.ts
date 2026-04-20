import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './throttle'

describe('createRateLimiter', () => {
    it('allows the first call', () => {
        const limiter = createRateLimiter(1000)
        expect(limiter.allow()).toBe(true)
    })

    it('blocks calls within the interval', () => {
        const limiter = createRateLimiter(1000)
        limiter.allow()
        expect(limiter.allow()).toBe(false)
    })

    it('allows calls after the interval passes', () => {
        const limiter = createRateLimiter(0)
        expect(limiter.allow()).toBe(true)
        expect(limiter.allow()).toBe(true)
    })

    it('reset allows immediate next call', () => {
        const limiter = createRateLimiter(10000)
        limiter.allow()
        expect(limiter.allow()).toBe(false)
        limiter.reset()
        expect(limiter.allow()).toBe(true)
    })

    it('works with different intervals', () => {
        const short = createRateLimiter(0)
        const long = createRateLimiter(60000)

        expect(short.allow()).toBe(true)
        expect(short.allow()).toBe(true)

        expect(long.allow()).toBe(true)
        expect(long.allow()).toBe(false)
    })
})