import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Star, Search } from 'lucide-react'
import { useArtists } from '../api/artists'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { LoadingPage, Skeleton } from '@/shared/components/ui/Loading'

export function ArtistsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const { data: artists, isLoading } = useArtists(searchQuery || undefined)

    return (
        <div className="page-container">
            <div className="mb-8">
                <h1 className="section-title flex items-center gap-3">
                    <Users className="w-8 h-8 text-accent-400" />
                    Artists
                </h1>
                <p className="section-subtitle">Explore artists and their concert ratings</p>
            </div>

            {/* Search */}
            <div className="mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search artists..."
                        className="input-field pl-12"
                    />
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-5">
                                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3" />
                                <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
                                <Skeleton className="h-4 w-1/2 mx-auto" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!artists || artists.length === 0) && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Users className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No artists found</h3>
                        <p className="text-surface-400">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Artists will appear here as events are added'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Artists Grid */}
            {!isLoading && artists && artists.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {artists.map(artist => (
                        <Link key={artist.id} to={`/artists/${artist.id}`}>
                            <Card hoverable>
                                <CardContent className="p-5 text-center">
                                    {/* Avatar */}
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-accent-500/30 to-primary-500/30 flex items-center justify-center text-2xl font-bold text-white">
                                        {artist.name.charAt(0)}
                                    </div>

                                    <h3 className="font-semibold text-white mb-2 line-clamp-1">
                                        {artist.name}
                                    </h3>

                                    <div className="flex items-center justify-center gap-2">
                                        <Badge variant="accent">Artist</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
