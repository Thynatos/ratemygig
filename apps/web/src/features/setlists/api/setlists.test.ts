import { describe, expect, it } from 'vitest'
import { setlistKeys, setlistSaveErrorMessage } from './setlists'

describe('setlistKeys', () => {
    it('generates all key', () => {
        expect(setlistKeys.all).toEqual(['setlists'])
    })

    it('generates byEvent key', () => {
        expect(setlistKeys.byEvent('event-1')).toEqual(['setlists', 'event', 'event-1'])
    })

    it('generates detail key', () => {
        expect(setlistKeys.detail('setlist-1')).toEqual(['setlists', 'detail', 'setlist-1'])
    })
})

describe('setlistSaveErrorMessage', () => {
    it('turns the rate limiter into a wait message', () => {
        expect(setlistSaveErrorMessage(new Error('Please wait before creating another setlist'))).toBe(
            'Give it a few seconds before saving again.'
        )
    })

    it('asks a signed-out user to sign in again', () => {
        expect(setlistSaveErrorMessage(new Error('Not authenticated'))).toBe('Sign in again to save the setlist.')
    })

    it('explains UNIQUE(event_id, user_id) as an existing setlist', () => {
        expect(setlistSaveErrorMessage({ code: '23505', message: 'duplicate key value' })).toBe(
            'You already have a setlist for this gig. Edit that one instead.'
        )
    })

    it('never shows the raw database message', () => {
        const rls = { code: '42501', message: 'new row violates row-level security policy for table "setlists"' }
        expect(setlistSaveErrorMessage(rls)).toBe("Couldn't save the setlist. Try again.")
    })
})
