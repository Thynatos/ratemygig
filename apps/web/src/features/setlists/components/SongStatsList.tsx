import { Link } from 'react-router-dom'
import { useArtistSongStats } from '../api/stats'
import { Skeleton } from '@/shared/components/ui/Loading'
import { EmptyState } from '@/shared/components/ui/Board'
import { formatDate } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

interface SongStatsListProps {
    artistId: string
}

/**
 * A dense data table, the way a wiki renders song statistics — but on rails,
 * with tabular figures and hairline rules instead of zebra striping.
 */
export function SongStatsList({ artistId }: SongStatsListProps) {
    const { data: songs, isLoading } = useArtistSongStats(artistId)

    if (isLoading) {
        return (
            <div className="space-y-1.5" role="status" aria-label="Loading song statistics">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-9 w-full" />
                ))}
            </div>
        )
    }

    if (!songs || songs.length === 0) {
        return (
            <EmptyState
                title="No setlists yet"
                body="Once someone writes down what was played, the counts appear here."
            />
        )
    }

    const max = Math.max(...songs.map(s => s.play_count), 1)

    return (
        <div className="border border-rail bg-board overflow-x-auto">
            <table className="w-full text-ui-sm">
                <caption className="sr-only">
                    Songs this artist has played live, most played first
                </caption>
                <thead>
                    <tr className="border-b border-rail-strong">
                        <th scope="col" className="voice-label text-bone-faint text-left px-3 py-2.5 w-10">
                            #
                        </th>
                        <th scope="col" className="voice-label text-bone-faint text-left px-3 py-2.5">
                            Song
                        </th>
                        <th scope="col" className="voice-label text-bone-faint text-right px-3 py-2.5">
                            Played
                        </th>
                        <th scope="col" className="voice-label text-bone-faint text-right px-3 py-2.5">
                            Last time
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {songs.map((song, index) => (
                        <tr
                            key={song.song_id}
                            className="border-b border-rail last:border-b-0 transition-colors duration-150 ease-board hover:bg-board-raised"
                        >
                            <td className="voice-data text-bone-faint px-3 py-2 tabular-nums">
                                {index + 1}
                            </td>
                            <td className="px-3 py-2">
                                <Link
                                    to={`/songs/${song.song_id}`}
                                    className="text-bone hover:text-strip"
                                >
                                    {sanitizeText(song.song_name)}
                                </Link>
                                <span
                                    aria-hidden="true"
                                    className="block h-[3px] bg-groove mt-1.5 max-w-[12rem]"
                                >
                                    <span
                                        className="block h-full bg-strip"
                                        style={{
                                            width: `${Math.max((song.play_count / max) * 100, 6)}%`,
                                        }}
                                    />
                                </span>
                            </td>
                            <td className="voice-data text-bone px-3 py-2 text-right tabular-nums align-top">
                                {song.play_count}
                            </td>
                            <td className="text-bone-dim px-3 py-2 text-right align-top whitespace-nowrap">
                                {formatDate(song.last_played, 'd MMM yyyy')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
