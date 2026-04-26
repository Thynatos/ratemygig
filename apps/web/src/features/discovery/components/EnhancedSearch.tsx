import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'

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

    const { data: events = [] } = useQuery({
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

    const { data: artists = [] } = useQuery({
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

    const { data: venues = [] } = useQuery({
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

    const hasResults = events.length > 0 || artists.length > 0 || venues.length > 0
    const showDropdown = isOpen && debouncedQuery.length >= 2

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
                    onFocus={() => { if (debouncedQuery.length >= 2) setIsOpen(true) }}
                    placeholder="Search events, artists, venues..."
                    className="input-field pl-10 w-full"
                />
            </div>

            {showDropdown && (
                <div className="absolute z-20 top-full mt-2 w-full bg-surface-800 border border-surface-600 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                    {events.length > 0 && (
                        <div>
                            <div className="px-4 py-2 text-xs uppercase tracking-wider text-surface-500 font-medium">Events</div>
                            {events.map(event => (
                                <Link
                                    key={event.id}
                                    to={`/events/${event.id}`}
                                    onClick={() => { setIsOpen(false); setQuery('') }}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-surface-700 transition-colors"
                                >
                                    <span className="text-white text-sm">{sanitizeText(event.name)}</span>
                                    <span className="text-surface-500 text-xs ml-auto">{sanitizeText(event.city)}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {artists.length > 0 && (
                        <div>
                            <div className="px-4 py-2 text-xs uppercase tracking-wider text-surface-500 font-medium border-t border-surface-700">Artists</div>
                            {artists.map(artist => (
                                <Link
                                    key={artist.id}
                                    to={`/artists/${artist.id}`}
                                    onClick={() => { setIsOpen(false); setQuery('') }}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-surface-700 transition-colors"
                                >
                                    <span className="text-white text-sm">{sanitizeText(artist.name)}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {venues.length > 0 && (
                        <div>
                            <div className="px-4 py-2 text-xs uppercase tracking-wider text-surface-500 font-medium border-t border-surface-700">Venues</div>
                            {venues.map(venue => (
                                <Link
                                    key={venue.id}
                                    to={`/venues/${venue.id}`}
                                    onClick={() => { setIsOpen(false); setQuery('') }}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-surface-700 transition-colors"
                                >
                                    <span className="text-white text-sm">{sanitizeText(venue.name)}</span>
                                    <span className="text-surface-500 text-xs ml-auto">{sanitizeText(venue.city)}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {!hasResults && debouncedQuery.length >= 2 && (
                        <div className="px-4 py-6 text-center text-surface-400 text-sm">
                            No results found for &ldquo;{debouncedQuery}&rdquo;
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}