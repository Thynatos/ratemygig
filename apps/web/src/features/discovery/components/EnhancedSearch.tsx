import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'
import { QueryErrorState } from '@/shared/components/QueryErrorState'

function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

export function EnhancedSearch() {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const debouncedQuery = useDebouncedValue(query, 300)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [])

    // No `= []` defaults: failed queries must surface as an error state, not
    // masquerade as "no results" (audit finding A13).
    const { data: eventsData, isError: eventsError, refetch: refetchEvents } = useQuery({
        queryKey: ['search', 'events', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) return []
            const { data, error } = await supabase
                .from('events')
                .select('id, name, start_at, city')
                .ilike('name', `%${debouncedQuery}%`)
                .order('start_at', { ascending: true })
                .limit(5)
            if (error) throw error
            return data as { id: string; name: string; start_at: string; city: string }[]
        },
        enabled: debouncedQuery.length >= 2,
    })
    const events = eventsData ?? []

    const { data: artistsData, isError: artistsError, refetch: refetchArtists } = useQuery({
        queryKey: ['search', 'artists', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) return []
            const { data, error } = await supabase
                .from('artists')
                .select('id, name')
                .ilike('name', `%${debouncedQuery}%`)
                .limit(5)
            if (error) throw error
            return data as { id: string; name: string }[]
        },
        enabled: debouncedQuery.length >= 2,
    })
    const artists = artistsData ?? []

    const { data: venuesData, isError: venuesError, refetch: refetchVenues } = useQuery({
        queryKey: ['search', 'venues', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) return []
            const { data, error } = await supabase
                .from('venues')
                .select('id, name, city')
                .ilike('name', `%${debouncedQuery}%`)
                .limit(5)
            if (error) throw error
            return data as { id: string; name: string; city: string }[]
        },
        enabled: debouncedQuery.length >= 2,
    })
    const venues = venuesData ?? []

    const searchError = eventsError || artistsError || venuesError
    const hasResults = events.length > 0 || artists.length > 0 || venues.length > 0
    const showDropdown = isOpen && debouncedQuery.length >= 2

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <label htmlFor="enhanced-search" className="sr-only">
                    Search gigs, artists and venues
                </label>
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-faint"
                    aria-hidden="true"
                />
                <input
                    id="enhanced-search"
                    type="search"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
                    onFocus={() => { if (debouncedQuery.length >= 2) setIsOpen(true) }}
                    placeholder="Gig, artist or venue"
                    className="input-field pl-9 w-full"
                />
            </div>

            {showDropdown && (
                <div className="absolute z-20 top-full mt-1 w-full bg-board border border-rail-strong shadow-lift max-h-80 overflow-y-auto">
                    {searchError ? (
                        <div className="p-3">
                            <QueryErrorState
                                title="Search failed"
                                message="The lookup didn't come back. Try again."
                                onRetry={() => {
                                    if (eventsError) refetchEvents()
                                    if (artistsError) refetchArtists()
                                    if (venuesError) refetchVenues()
                                }}
                            />
                        </div>
                    ) : (
                        <>
                    {events.length > 0 && (
                        <div>
                            <h2 className="voice-label text-bone-faint px-3 py-2 border-b border-rail">Gigs</h2>
                            {events.map(event => (
                                <Link
                                    key={event.id}
                                    to={`/events/${event.id}`}
                                    onClick={() => { setIsOpen(false); setQuery('') }}
                                    className="flex items-center gap-3 px-3 py-2 transition-colors duration-150 ease-board hover:bg-board-raised"
                                >
                                    <span className="text-ui text-bone">{sanitizeText(event.name)}</span>
                                    <span className="voice-label text-bone-faint ml-auto">{sanitizeText(event.city)}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {artists.length > 0 && (
                        <div>
                            <h2 className="voice-label text-bone-faint px-3 py-2 border-y border-rail">Artists</h2>
                            {artists.map(artist => (
                                <Link
                                    key={artist.id}
                                    to={`/artists/${artist.id}`}
                                    onClick={() => { setIsOpen(false); setQuery('') }}
                                    className="flex items-center gap-3 px-3 py-2 transition-colors duration-150 ease-board hover:bg-board-raised"
                                >
                                    <span className="text-ui text-bone">{sanitizeText(artist.name)}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {venues.length > 0 && (
                        <div>
                            <h2 className="voice-label text-bone-faint px-3 py-2 border-y border-rail">Venues</h2>
                            {venues.map(venue => (
                                <Link
                                    key={venue.id}
                                    to={`/venues/${venue.id}`}
                                    onClick={() => { setIsOpen(false); setQuery('') }}
                                    className="flex items-center gap-3 px-3 py-2 transition-colors duration-150 ease-board hover:bg-board-raised"
                                >
                                    <span className="text-ui text-bone">{sanitizeText(venue.name)}</span>
                                    <span className="voice-label text-bone-faint ml-auto">{sanitizeText(venue.city)}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {!hasResults && debouncedQuery.length >= 2 && (
                        <p className="px-3 py-6 text-center text-ui-sm text-bone-dim">
                            Nothing matches &ldquo;{debouncedQuery}&rdquo;.
                        </p>
                    )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}