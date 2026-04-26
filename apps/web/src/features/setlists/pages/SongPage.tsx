import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Music } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useSongStats } from '../api/stats'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { formatDate } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { Song } from '@core/index'

export function SongPage() {
    const { songId } = useParams<{ songId: string }>()

    const { data: song, isLoading: songLoading } = useQuery({
        queryKey: ['song', songId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', songId!)
                .single()

            if (error) throw error
            return data as Song
        },
        enabled: !!songId,
    })

    const { data: stats = [], isLoading: statsLoading } = useSongStats(songId!)

    if (songLoading || statsLoading) return <LoadingPage message="Loading song..." />

    if (!song) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <h2 className="text-xl font-semibold text-white mb-2">Song not found</h2>
                        <Link to="/">
                            <Button variant="secondary">Back to Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const totalPlays = stats.reduce((sum, s) => sum + s.play_count, 0)
    const firstPlayed = stats.length > 0 ? stats.reduce((earliest, s) => s.first_played < earliest ? s.first_played : earliest, stats[0].first_played) : null
    const lastPlayed = stats.length > 0 ? stats.reduce((latest, s) => s.last_played > latest ? s.last_played : latest, stats[0].last_played) : null

    return (
        <div className="page-container">
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                Back
            </Link>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                    <Music className="w-8 h-8 text-primary-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-display font-bold text-white">{sanitizeText(song.name)}</h1>
                                    {song.artist_id && stats.length > 0 && (
                                        <Link
                                            to={`/artists/${song.artist_id}`}
                                            className="text-primary-400 hover:text-primary-300 transition-colors"
                                        >
                                            {sanitizeText(stats[0].artist_name)}
                                        </Link>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-4 rounded-xl bg-surface-800/50">
                                    <div className="text-2xl font-bold text-white">{totalPlays}</div>
                                    <div className="text-xs text-surface-400 uppercase tracking-wide">Times Played</div>
                                </div>
                                {firstPlayed && (
                                    <div className="text-center p-4 rounded-xl bg-surface-800/50">
                                        <div className="text-sm font-medium text-white">{formatDate(firstPlayed)}</div>
                                        <div className="text-xs text-surface-400 uppercase tracking-wide">First Played</div>
                                    </div>
                                )}
                                {lastPlayed && (
                                    <div className="text-center p-4 rounded-xl bg-surface-800/50">
                                        <div className="text-sm font-medium text-white">{formatDate(lastPlayed)}</div>
                                        <div className="text-xs text-surface-400 uppercase tracking-wide">Last Played</div>
                                    </div>
                                )}
                            </div>

                            {stats.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Artists Who Play This Song</h3>
                                    <div className="space-y-2">
                                        {stats.map(stat => (
                                            <Link
                                                key={stat.artist_id}
                                                to={`/artists/${stat.artist_id}`}
                                                className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50 hover:bg-surface-700 transition-colors"
                                            >
                                                <span className="text-white font-medium">{stat.artist_name}</span>
                                                <span className="text-surface-400 text-sm">{stat.play_count} {stat.play_count === 1 ? 'play' : 'plays'}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {totalPlays === 0 && (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Music className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                                <p className="text-surface-400">This song hasn't been added to any setlists yet</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}