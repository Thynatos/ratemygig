import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { checkA11y } from '@/test/axe'
import { BrowserRouter } from 'react-router-dom'
import { EventCard } from '@/features/events/components/EventCard'
import { FeedCard } from '@/features/feed/components/FeedCard'
import { PhotoUploader } from '@/features/reviews/components/PhotoUploader'
import type { Event } from '@core/index'
import type { FeedItem } from '@/features/feed/api/feed'

const mockEvent: Event = {
    id: 'evt-1',
    provider: 'mock',
    provider_event_id: 'tm-1',
    name: 'Taylor Swift Eras Tour',
    start_at: '2030-06-15T20:00:00Z',
    city: 'London',
    country: 'UK',
    venue_id: 'venue-1',
    venue: {
        id: 'venue-1',
        name: 'Wembley Stadium',
        city: 'London',
        country: 'UK',
        lat: null,
        lng: null,
        provider_venue_id: null,
        created_at: '2024-01-01',
    },
    ticket_urls: [{ label: 'Ticketmaster', url: 'https://tickets.example.com' }],
    lineup: ['Taylor Swift', 'Sabrina Carpenter', 'Gracie Abrams'],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
}

const pastEvent: Event = {
    ...mockEvent,
    id: 'evt-2',
    start_at: '2020-01-01T20:00:00Z',
    ticket_urls: [],
}

function renderWithRouter(ui: React.ReactElement) {
    return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('EventCard', () => {
    it('renders event name and venue', () => {
        renderWithRouter(<EventCard event={mockEvent} />)
        expect(screen.getByText('Taylor Swift Eras Tour')).toBeInTheDocument()
        expect(screen.getByText(/Wembley Stadium/)).toBeInTheDocument()
    })

    it('shows date box with day and month', () => {
        renderWithRouter(<EventCard event={mockEvent} />)
        expect(screen.getByText('15')).toBeInTheDocument()
        expect(screen.getByText('Jun')).toBeInTheDocument()
    })

    it('shows artist badges limited to 2 with overflow', () => {
        renderWithRouter(<EventCard event={mockEvent} />)
        expect(screen.getByText('Taylor Swift')).toBeInTheDocument()
        expect(screen.getByText('Sabrina Carpenter')).toBeInTheDocument()
        expect(screen.getByText('+1')).toBeInTheDocument()
    })

    it('shows Tickets indicator for future events with tickets', () => {
        renderWithRouter(<EventCard event={mockEvent} />)
        expect(screen.getByText('Tickets')).toBeInTheDocument()
    })

    it('shows Past badge for past events', () => {
        renderWithRouter(<EventCard event={pastEvent} />)
        expect(screen.getByText('Past')).toBeInTheDocument()
    })

    it('links to event detail page', () => {
        renderWithRouter(<EventCard event={mockEvent} />)
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/events/evt-1')
    })

    it('renders friends going badge when friendsGoing is provided', () => {
        const friendsGoing = [
            { userId: 'user-1', displayName: 'Alex', avatarUrl: null },
            { userId: 'user-2', displayName: 'Sam', avatarUrl: null },
        ]
        renderWithRouter(<EventCard event={mockEvent} friendsGoing={friendsGoing} />)
        expect(screen.getByText('2 friends going')).toBeInTheDocument()
    })

    it('pluralizes the badge for a single friend', () => {
        const friendsGoing = [{ userId: 'user-1', displayName: 'Alex', avatarUrl: null }]
        renderWithRouter(<EventCard event={mockEvent} friendsGoing={friendsGoing} />)
        expect(screen.getByText('1 friend going')).toBeInTheDocument()
    })

    it('renders no badge when friendsGoing is omitted', () => {
        renderWithRouter(<EventCard event={mockEvent} />)
        expect(screen.queryByText(/friends? going/)).not.toBeInTheDocument()
    })

    it('renders no badge when friendsGoing is empty', () => {
        renderWithRouter(<EventCard event={mockEvent} friendsGoing={[]} />)
        expect(screen.queryByText(/friends? going/)).not.toBeInTheDocument()
    })

    it('has no accessibility violations', async () => {
        const { container } = renderWithRouter(<EventCard event={mockEvent} />)
        expect(await checkA11y(container)).toHaveNoViolations()
    })
})

describe('FeedCard', () => {
    it('renders review feed item', () => {
        const item: FeedItem = {
            type: 'review',
            id: 'feed-1',
            created_at: '2024-01-01T00:00:00Z',
            author: {
                id: 'user-1',
                username: 'johndoe',
                display_name: 'John Doe',
                avatar_url: null,
            },
            review: {
                id: 'rev-1',
                rating: 4,
                title: 'Amazing show!',
                body: 'Best concert ever.',
                created_at: '2024-01-01T00:00:00Z',
            },
            event: {
                id: 'evt-1',
                name: 'Taylor Swift',
            },
        }
        renderWithRouter(<FeedCard item={item} />)
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText(/Amazing show!/)).toBeInTheDocument()
        expect(screen.getByText(/Best concert ever/)).toBeInTheDocument()
    })

    it('renders event feed item', () => {
        const item: FeedItem = {
            type: 'event',
            id: 'feed-2',
            created_at: '2024-01-01T00:00:00Z',
            event: {
                id: 'evt-1',
                name: 'Coldplay Concert',
                start_at: '2025-07-20T19:00:00Z',
            },
            venue: {
                id: 'venue-1',
                name: 'The O2',
                city: 'London',
            },
        }
        renderWithRouter(<FeedCard item={item} />)
        expect(screen.getByText('Upcoming event')).toBeInTheDocument()
        expect(screen.getByText('Coldplay Concert')).toBeInTheDocument()
    })

    it('renders attendance feed item', () => {
        const item: FeedItem = {
            type: 'attendance',
            id: 'feed-3',
            created_at: '2024-01-01T00:00:00Z',
            user: {
                id: 'user-1',
                username: 'janedoe',
                display_name: 'Jane Doe',
                avatar_url: null,
            },
            status: 'planned',
            event: {
                id: 'evt-1',
                name: 'Arctic Monkeys',
                start_at: '2025-08-10T20:00:00Z',
            },
            venue: null,
        }
        renderWithRouter(<FeedCard item={item} />)
        expect(screen.getByText('Jane Doe')).toBeInTheDocument()
        expect(screen.getByText(/planning to attend/)).toBeInTheDocument()
    })

    it('renders anonymous author when author is missing', () => {
        const item: FeedItem = {
            type: 'review',
            id: 'feed-4',
            created_at: '2024-01-01T00:00:00Z',
            author: null,
            review: {
                id: 'rev-1',
                rating: 5,
                title: null,
                body: 'Great show.',
                created_at: '2024-01-01T00:00:00Z',
            },
            event: null,
        }
        renderWithRouter(<FeedCard item={item} />)
        expect(screen.getByText('Anonymous')).toBeInTheDocument()
    })
})

describe('PhotoUploader', () => {
    it('renders upload area when no photos', () => {
        render(<PhotoUploader photos={[]} onAdd={vi.fn()} onRemove={vi.fn()} />)
        expect(screen.getByText(/Drop photos here/)).toBeInTheDocument()
    })

    it('renders photos and remove button', () => {
        const photos = [
            { id: 'p1', url: 'https://example.com/1.jpg' },
            { id: 'p2', url: 'https://example.com/2.jpg' },
        ]
        render(<PhotoUploader photos={photos} onAdd={vi.fn()} onRemove={vi.fn()} />)
        expect(screen.getByAltText('Photo 1')).toBeInTheDocument()
        expect(screen.getByAltText('Photo 2')).toBeInTheDocument()
    })

    it('calls onRemove when remove button clicked', () => {
        const handleRemove = vi.fn()
        const photos = [{ id: 'p1', url: 'https://example.com/1.jpg' }]
        render(<PhotoUploader photos={photos} onAdd={vi.fn()} onRemove={handleRemove} />)
        const removeBtn = screen.getByRole('button', { name: '' })
        fireEvent.click(removeBtn)
        expect(handleRemove).toHaveBeenCalledWith(0)
    })

    it('hides upload area when max photos reached', () => {
        const photos = Array.from({ length: 10 }, (_, i) => ({
            id: `p${i}`,
            url: `https://example.com/${i}.jpg`,
        }))
        render(<PhotoUploader photos={photos} onAdd={vi.fn()} onRemove={vi.fn()} maxPhotos={10} />)
        expect(screen.queryByText(/Drop photos here/)).not.toBeInTheDocument()
    })

    it('shows add more button when photos exist but under limit', () => {
        const photos = [{ id: 'p1', url: 'https://example.com/1.jpg' }]
        render(<PhotoUploader photos={photos} onAdd={vi.fn()} onRemove={vi.fn()} maxPhotos={5} />)
        expect(screen.getByText('Add')).toBeInTheDocument()
    })

    it('calls onAdd with valid files on input change', () => {
        const handleAdd = vi.fn()
        render(<PhotoUploader photos={[]} onAdd={handleAdd} onRemove={vi.fn()} />)

        const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [file] } })

        expect(handleAdd).toHaveBeenCalledWith(expect.arrayContaining([expect.any(File)]))
    })

    it('shows error for invalid file type', () => {
        const handleAdd = vi.fn()
        render(<PhotoUploader photos={[]} onAdd={handleAdd} onRemove={vi.fn()} />)

        const file = new File(['dummy'], 'doc.txt', { type: 'text/plain' })
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [file] } })

        expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
        expect(handleAdd).not.toHaveBeenCalled()
    })

    it('shows error for oversized file', () => {
        const handleAdd = vi.fn()
        render(<PhotoUploader photos={[]} onAdd={handleAdd} onRemove={vi.fn()} maxSizeMB={1} />)

        const file = new File(['x'.repeat(2 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' })
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [file] } })

        expect(screen.getByText(/File too large/)).toBeInTheDocument()
    })
})
