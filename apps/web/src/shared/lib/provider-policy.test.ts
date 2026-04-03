import { describe, expect, it } from 'vitest'
import {
    allowsMockFallback,
    allowsTicketmasterLive,
    getDatabaseProviderFilter,
    getProviderModeLabel,
    getProviderPolicy,
} from './provider-policy'

describe('provider policy', () => {
    it('treats mock mode as mock-only fallback', () => {
        expect(getDatabaseProviderFilter('mock')).toBe('mock')
        expect(allowsMockFallback('mock')).toBe(true)
        expect(allowsTicketmasterLive('mock')).toBe(false)
    })

    it('treats ticketmaster mode as strict no-mock mode', () => {
        expect(getDatabaseProviderFilter('ticketmaster')).toBe('ticketmaster')
        expect(allowsMockFallback('ticketmaster')).toBe(false)
        expect(allowsTicketmasterLive('ticketmaster')).toBe(true)
    })

    it('treats all mode as unfiltered DB mode', () => {
        expect(getProviderPolicy('all')).toEqual({
            mode: 'all',
            dbProviderFilter: null,
            allowsMockFallback: true,
            allowsTicketmasterLive: true,
        })
    })

    it('returns readable provider labels', () => {
        expect(getProviderModeLabel('mock')).toBe('mock provider')
        expect(getProviderModeLabel('ticketmaster')).toBe('Ticketmaster')
        expect(getProviderModeLabel('all')).toBe('all providers')
    })
})
