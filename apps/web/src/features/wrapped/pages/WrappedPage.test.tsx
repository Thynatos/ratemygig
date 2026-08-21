import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WrappedPage } from './WrappedPage'
import { useYearStats } from '@/features/wrapped/api/yearStats'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { checkA11y } from '@/test/axe'
import type { UserYearStats } from '@core/index'

vi.mock('@/features/wrapped/api/yearStats', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/wrapped/api/yearStats')>()
    return {
        ...actual,
        useYearStats: vi.fn(),
    }
})

vi.mock('@/features/auth/hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

const mockUseYearStats = vi.mocked(useYearStats)
const mockUseAuth = vi.mocked(useAuth)

const fullStats: UserYearStats = {
    gigs_attended: 12,
    reviews_written: 8,
    avg_rating_given: 4.2,
    photos_uploaded: 15,
    distinct_cities: 3,
    first_gig_date: '2026-02-01T19:00:00+00:00',
    last_gig_date: '2026-11-20T20:30:00+00:00',
    top_artists: [
        { name: 'Artist A', count: 4 },
        { name: 'Artist B', count: 2 },
    ],
    top_venues: [{ name: 'Venue X', count: 5 }],
}

const zeroStats: UserYearStats = {
    ...fullStats,
    gigs_attended: 0,
    reviews_written: 0,
    photos_uploaded: 0,
    distinct_cities: 0,
    first_gig_date: null,
    last_gig_date: null,
    top_artists: [],
    top_venues: [],
}

function renderPage(initialEntry = '/wrapped') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <WrappedPage />
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', app_metadata: {} },
    } as unknown as ReturnType<typeof useAuth>)
    mockUseYearStats.mockReturnValue({
        data: fullStats,
        isLoading: false,
    } as unknown as ReturnType<typeof useYearStats>)
})

afterEach(() => {
    vi.useRealTimers()
})

describe('WrappedPage', () => {
    it('renders stat values and top lists', () => {
        renderPage()
        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
        expect(screen.getByText('4.2')).toBeInTheDocument()
        expect(screen.getByText('Artist A')).toBeInTheDocument()
        expect(screen.getByText('Artist B')).toBeInTheDocument()
        expect(screen.getByText('Venue X')).toBeInTheDocument()
        expect(screen.getByText('4 gigs')).toBeInTheDocument()
    })

    it('renders the empty state when there are no gigs', () => {
        mockUseYearStats.mockReturnValue({
            data: zeroStats,
            isLoading: false,
        } as unknown as ReturnType<typeof useYearStats>)
        renderPage()
        expect(screen.getByText(/No gigs in/)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Discover shows/i })).toHaveAttribute('href', '/')
        expect(screen.queryByText('Artist A')).not.toBeInTheDocument()
    })

    it('requests the ?year param when provided', () => {
        renderPage('/wrapped?year=2024')
        expect(mockUseYearStats).toHaveBeenCalledWith('user-1', 2024)
    })

    it('defaults to the previous year in January', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
        renderPage()
        expect(mockUseYearStats).toHaveBeenCalledWith('user-1', 2025)
    })

    it('navigates to the previous year on prev click', () => {
        renderPage('/wrapped?year=2025')
        fireEvent.click(screen.getByRole('button', { name: 'Previous year' }))
        expect(mockUseYearStats).toHaveBeenLastCalledWith('user-1', 2024)
    })

    it('disables next at the current year', () => {
        const currentYear = new Date().getFullYear()
        renderPage(`/wrapped?year=${currentYear}`)
        expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled()
    })

    it('disables prev at the minimum year', () => {
        renderPage('/wrapped?year=2000')
        expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled()
    })

    it('has no accessibility violations', async () => {
        const { container } = renderPage()
        expect(await checkA11y(container)).toHaveNoViolations()
    })
})
