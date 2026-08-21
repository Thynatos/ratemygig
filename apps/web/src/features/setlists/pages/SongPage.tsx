import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useSongStats } from '../api/stats'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { BoardHeader, EmptyState, Figure, FigureRail } from '@/shared/components/ui/Board'
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

    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as zero plays (audit finding A13).
    const {
        data: statsData,
        isLoading: statsLoading,
        isError: statsError,
        refetch: refetchStats,
    } = useSongStats(songId!)
    const stats = statsData ?? []

    if (songLoading || statsLoading) return <LoadingPage message="Counting the plays" />

    if (statsError) {
        return (
            <div className="page page-body">
                <QueryErrorState
                    title="Couldn't load this song's history"
                    onRetry={() => refetchStats()}
                />
            </div>
        )
    }

    if (!song) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such song"
                    body="Nothing by that name is in any setlist on the board."
                    action={
                        <Link to="/" className="btn-secondary">
                            See what's on
                        </Link>
                    }
                />
            </div>
        )
    }

    const totalPlays = stats.reduce((sum, s) => sum + s.play_count, 0)
    const firstPlayed =
        stats.length > 0
            ? stats.reduce(
                (earliest, s) => (s.first_played < earliest ? s.first_played : earliest),
                stats[0].first_played
            )
            : null
    const lastPlayed =
        stats.length > 0
            ? stats.reduce(
                (latest, s) => (s.last_played > latest ? s.last_played : latest),
                stats[0].last_played
            )
            : null
    const max = Math.max(...stats.map(s => s.play_count), 1)

    return (
        <div className="page page-body max-w-3xl">
            <Link
                to={song.artist_id ? `/artists/${song.artist_id}` : '/'}
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                {song.artist_id && stats.length > 0
                    ? sanitizeText(stats[0].artist_name)
                    : "What's on"}
            </Link>

            <BoardHeader
                strip={
                    totalPlays > 0
                        ? `Played live ${totalPlays} ${totalPlays === 1 ? 'time' : 'times'}`
                        : 'Never logged live'
                }
                title={sanitizeText(song.name)}
                lede={
                    stats.length > 0 ? (
                        <>
                            Played by{' '}
                            {stats.length === 1
                                ? sanitizeText(stats[0].artist_name)
                                : `${stats.length} different artists`}
                            .
                        </>
                    ) : undefined
                }
            >
                {totalPlays > 0 && (
                    <FigureRail className="sm:grid-cols-3">
                        <Figure value={totalPlays} label="Times played" accent />
                        <Figure
                            value={firstPlayed ? formatDate(firstPlayed, 'd MMM yyyy') : '—'}
                            label="First time"
                        />
                        <Figure
                            value={lastPlayed ? formatDate(lastPlayed, 'd MMM yyyy') : '—'}
                            label="Most recent"
                        />
                    </FigureRail>
                )}
            </BoardHeader>

            {totalPlays === 0 ? (
                <EmptyState
                    title="Not in any setlist yet"
                    body="Nobody has written this one down as played live. Add it to a setlist and it starts counting."
                />
            ) : (
                <section>
                    <h2 className="voice-label text-bone-dim mb-3">
                        {stats.length === 1 ? 'Who plays it' : 'Who plays it'}
                    </h2>
                    <ul className="rail-list">
                        {stats.map(stat => (
                            <li key={stat.artist_id}>
                                <Link
                                    to={`/artists/${stat.artist_id}`}
                                    className="row row-interactive items-center"
                                >
                                    <span className="row-slot">
                                        <span className="voice-board tnum text-strip text-[1.75rem] leading-none">
                                            {stat.play_count}
                                        </span>
                                    </span>
                                    <span className="row-body">
                                        <span className="row-title">
                                            {sanitizeText(stat.artist_name)}
                                        </span>
                                        <span
                                            aria-hidden="true"
                                            className="block h-1.5 bg-groove mt-1 max-w-[14rem]"
                                        >
                                            <span
                                                className="block h-full bg-strip"
                                                style={{
                                                    width: `${Math.max((stat.play_count / max) * 100, 6)}%`,
                                                }}
                                            />
                                        </span>
                                    </span>
                                    <span className="row-end">
                                        <span className="voice-label text-bone-faint">
                                            {stat.play_count === 1 ? 'play' : 'plays'}
                                        </span>
                                        <span className="voice-label text-bone-faint">
                                            last {formatDate(stat.last_played, 'MMM yyyy')}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
