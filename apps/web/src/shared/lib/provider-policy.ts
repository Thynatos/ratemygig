import { env, type EventsProviderMode } from './env'

export type DatabaseProviderFilter = 'mock' | 'ticketmaster' | null

export interface ProviderPolicy {
    mode: EventsProviderMode
    dbProviderFilter: DatabaseProviderFilter
    allowsMockFallback: boolean
    allowsTicketmasterLive: boolean
}

export function isMockMode(mode: EventsProviderMode = env.EVENTS_PROVIDER): boolean {
    return mode === 'mock'
}

export function isTicketmasterMode(mode: EventsProviderMode = env.EVENTS_PROVIDER): boolean {
    return mode === 'ticketmaster'
}

export function isAllMode(mode: EventsProviderMode = env.EVENTS_PROVIDER): boolean {
    return mode === 'all'
}

export function getDatabaseProviderFilter(
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): DatabaseProviderFilter {
    if (mode === 'all') return null
    return mode
}

export function allowsMockFallback(mode: EventsProviderMode = env.EVENTS_PROVIDER): boolean {
    return mode !== 'ticketmaster'
}

export function allowsTicketmasterLive(mode: EventsProviderMode = env.EVENTS_PROVIDER): boolean {
    return mode !== 'mock'
}

export function getProviderPolicy(mode: EventsProviderMode = env.EVENTS_PROVIDER): ProviderPolicy {
    return {
        mode,
        dbProviderFilter: getDatabaseProviderFilter(mode),
        allowsMockFallback: allowsMockFallback(mode),
        allowsTicketmasterLive: allowsTicketmasterLive(mode),
    }
}

export function getProviderModeLabel(mode: EventsProviderMode = env.EVENTS_PROVIDER): string {
    if (mode === 'ticketmaster') return 'Ticketmaster'
    if (mode === 'all') return 'all providers'
    return 'mock provider'
}
