import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PreferencesForm } from './PreferencesForm'
import { useUserPreferences, useUpdatePreferences, useClearPreferences } from '@/features/discovery/api/preferences'
import type { UserPreferences } from '@core/index'

vi.mock('@/features/discovery/api/preferences', () => ({
    useUserPreferences: vi.fn(),
    useUpdatePreferences: vi.fn(),
    useClearPreferences: vi.fn(),
}))

vi.mock('@/shared/hooks/useGeolocation', () => ({
    useGeolocation: () => ({
        latitude: null,
        longitude: null,
        error: null,
        isLoading: false,
        isSupported: false,
        requestLocation: vi.fn(),
    }),
}))

const mockUseUserPreferences = vi.mocked(useUserPreferences)
const mockUseUpdatePreferences = vi.mocked(useUpdatePreferences)
const mockUseClearPreferences = vi.mocked(useClearPreferences)

const fullPrefs: UserPreferences = {
    id: 'pref-1',
    user_id: 'user-1',
    preferred_city: 'London',
    preferred_lat: null,
    preferred_lng: null,
    notify_artist_events: true,
    notify_venue_events: true,
    notify_new_reviews: true,
    notify_comments: false,
    notify_reactions: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
}

let updateMutate: ReturnType<typeof vi.fn>

beforeEach(() => {
    vi.clearAllMocks()
    updateMutate = vi.fn()
    mockUseUserPreferences.mockReturnValue({
        data: fullPrefs,
        isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>)
    mockUseUpdatePreferences.mockReturnValue({
        mutate: updateMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useUpdatePreferences>)
    mockUseClearPreferences.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
    } as unknown as ReturnType<typeof useClearPreferences>)
})

describe('PreferencesForm notification toggles', () => {
    it('renders five notification toggles', () => {
        render(<PreferencesForm />)
        expect(screen.getAllByRole('switch')).toHaveLength(5)
        expect(screen.getByText('New dates from artists you follow')).toBeInTheDocument()
        expect(screen.getByText('New dates at rooms you follow')).toBeInTheDocument()
        expect(screen.getByText('Reviews from people you follow')).toBeInTheDocument()
        expect(screen.getByText('Replies to your reviews')).toBeInTheDocument()
        expect(screen.getByText('Reactions to your reviews')).toBeInTheDocument()
    })

    it('reflects current preference values', () => {
        render(<PreferencesForm />)
        expect(screen.getByRole('switch', { name: 'New dates from artists you follow' })).toHaveAttribute('aria-checked', 'true')
        expect(screen.getByRole('switch', { name: 'Replies to your reviews' })).toHaveAttribute('aria-checked', 'false')
    })

    it('calls the mutation with the flipped value when a toggle is clicked', () => {
        render(<PreferencesForm />)
        fireEvent.click(screen.getByRole('switch', { name: 'New dates from artists you follow' }))
        expect(updateMutate).toHaveBeenCalledWith({ notify_artist_events: false })
    })

    it('turns an opted-out type back on', () => {
        render(<PreferencesForm />)
        fireEvent.click(screen.getByRole('switch', { name: 'Replies to your reviews' }))
        expect(updateMutate).toHaveBeenCalledWith({ notify_comments: true })
    })

    it('defaults toggles to on when no preferences row exists', () => {
        mockUseUserPreferences.mockReturnValue({
            data: null,
            isLoading: false,
        } as unknown as ReturnType<typeof useUserPreferences>)
        render(<PreferencesForm />)
        for (const toggle of screen.getAllByRole('switch')) {
            expect(toggle).toHaveAttribute('aria-checked', 'true')
        }
        fireEvent.click(screen.getByRole('switch', { name: 'Reactions to your reviews' }))
        expect(updateMutate).toHaveBeenCalledWith({ notify_reactions: false })
    })
})
