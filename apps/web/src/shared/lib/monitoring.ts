// Central monitoring (Sentry) wiring.
//
// Everything here no-ops when VITE_SENTRY_DSN is unset, so local dev, unit
// tests and CI stay completely silent. The DSN is a public value — safe to
// ship in the client bundle.
import * as Sentry from '@sentry/react'
import { env } from './env'

const TRACES_SAMPLE_RATE = 0.1

export function isMonitoringEnabled(): boolean {
    return Boolean(env.SENTRY_DSN)
}

export function initMonitoring(): void {
    if (!env.SENTRY_DSN) return

    Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT,
        release: env.SENTRY_RELEASE ?? undefined,
        tracesSampleRate: TRACES_SAMPLE_RATE,
    })
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!env.SENTRY_DSN) return
    Sentry.captureException(error, context ? { extra: context } : undefined)
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
    if (!env.SENTRY_DSN) return
    Sentry.captureMessage(message, context ? { extra: context } : undefined)
}
