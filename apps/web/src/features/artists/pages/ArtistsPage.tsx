import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useArtists } from '../api/artists'
import { Button } from '@/shared/components/ui/Button'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn } from '@/shared/lib/utils'

const PAGE_SIZE = 24

export function ArtistsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const { pathname } = useLocation()

    const { data, isLoading } = useArtists(searchQuery || undefined, page, PAGE_SIZE)

    const artists = data?.data ?? []
    const hasMore = data?.hasMore ?? false

    return (
        <div className="page page-body">
            <BoardHeader
                // The paginated result carries no total, so the strip states
                // what is actually on screen rather than a number we can't back.
                strip={
                    artists.length > 0
                        ? searchQuery
                            ? `${artists.length} matching “${searchQuery}”`
                            : `${artists.length} showing`
                        : undefined
                }
                title="Artists"
                lede="Everyone who has played a gig on the board. Open one to see where they've played and how the nights were rated."
            >
                <div className="tab-rail mb-4">
                    <Link
                        to="/artists"
                        className={cn('tab', pathname === '/artists' && 'tab-active')}
                        aria-current={pathname === '/artists' ? 'page' : undefined}
                    >
                        All artists
                    </Link>
                    <Link
                        to="/artists/top"
                        className={cn('tab', pathname === '/artists/top' && 'tab-active')}
                    >
                        Top rated
                    </Link>
                </div>

                <div className="relative max-w-md">
                    <label htmlFor="artist-search" className="sr-only">
                        Search artists
                    </label>
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-faint"
                        aria-hidden="true"
                    />
                    <input
                        id="artist-search"
                        type="search"
                            autoComplete="off"
                            spellCheck={false}
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value)
                            setPage(1)
                        }}
                        placeholder="Search artists"
                        className="input-field pl-9"
                    />
                </div>
            </BoardHeader>

            {isLoading && page === 1 && <RowSkeletonList count={8} label="Loading artists" />}

            {!isLoading && artists.length === 0 && (
                <EmptyState
                    title={searchQuery ? 'No artist by that name' : 'No artists yet'}
                    body={
                        searchQuery
                            ? `Nothing matches “${searchQuery}”. Check the spelling, or try part of the name.`
                            : 'Artists appear here as gigs are added to the board.'
                    }
                    action={
                        searchQuery ? (
                            <Button variant="secondary" onClick={() => setSearchQuery('')}>
                                Clear search
                            </Button>
                        ) : (
                            <Link to="/" className="btn-secondary">
                                See what's on
                            </Link>
                        )
                    }
                />
            )}

            {(!isLoading || page > 1) && artists.length > 0 && (
                <>
                    <ul className="rail-list">
                        {artists.map(artist => {
                            const name = sanitizeText(artist.name)
                            return (
                                <li key={artist.id}>
                                    <Link
                                        to={`/artists/${artist.id}`}
                                        className="row row-interactive"
                                    >
                                        <span className="row-slot">
                                            <span
                                                className="voice-board text-bone-dim text-[1.75rem] leading-none"
                                                aria-hidden="true"
                                            >
                                                {name.charAt(0)}
                                            </span>
                                        </span>
                                        <span className="row-body">
                                            <span className="row-title">{name}</span>
                                        </span>
                                        <span className="row-end">
                                            <span className="voice-label text-bone-faint">
                                                View
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>

                    {hasMore && (
                        <div className="mt-4">
                            <Button
                                variant="secondary"
                                onClick={() => setPage(p => p + 1)}
                                isLoading={isLoading && page > 1}
                                loadingLabel="Loading more artists"
                            >
                                Show more artists
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
