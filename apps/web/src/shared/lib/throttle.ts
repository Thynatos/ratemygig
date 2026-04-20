export function createRateLimiter(minIntervalMs: number) {
    let lastCall = 0

    return {
        allow(): boolean {
            const now = Date.now()
            if (now - lastCall < minIntervalMs) {
                return false
            }
            lastCall = now
            return true
        },
        reset(): void {
            lastCall = 0
        },
    }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delayMs: number,
): T & { cancel: () => void } {
    let lastCall = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const throttled = function (this: unknown, ...args: unknown[]) {
        const now = Date.now()
        const remaining = delayMs - (now - lastCall)

        if (remaining <= 0) {
            lastCall = now
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
            return fn.apply(this, args)
        }

        if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now()
                timeoutId = null
                fn.apply(this, args)
            }, remaining)
        }
    } as T & { cancel: () => void }

    throttled.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }
    }

    return throttled
}