import { Link } from 'react-router-dom'
import { Music } from 'lucide-react'
import { useArtistSongStats } from '../api/stats'
import { Skeleton } from '@/shared/components/ui/Loading'
import { formatDate } from '@/shared/lib/utils'

interface SongStatsListProps {
    artistId: string
}

export function SongStatsList({ artistId }: SongStatsListProps) {
    const { data: songs, isLoading } = useArtistSongStats(artistId)

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        )
    }

    if (!songs || songs.length === 0) {
        return (
            <div className="text-center py-8">
                <Music className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                <p className="text-surface-400">No setlist data yet for this artist</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-surface-700">
                        <th className="text-left py-2 px-3 text-surface-500 text-sm font-medium">#</th>
                        <th className="text-left py-2 px-3 text-surface-500 text-sm font-medium">Song</th>
                        <th className="text-right py-2 px-3 text-surface-500 text-sm font-medium">Times Played</th>
                        <th className="text-right py-2 px-3 text-surface-500 text-sm font-medium">Last Played</th>
                    </tr>
                </thead>
                <tbody>
                    {songs.map((song, index) => (
                        <tr key={song.song_id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                            <td className="py-2 px-3 text-surface-500 font-mono text-sm">{index + 1}</td>
                            <td className="py-2 px-3">
                                <Link
                                    to={`/songs/${song.song_id}`}
                                    className="text-white hover:text-primary-400 transition-colors"
                                >
                                    {song.song_name}
                                </Link>
                            </td>
                            <td className="py-2 px-3 text-right text-surface-300">{song.play_count}</td>
                            <td className="py-2 px-3 text-right text-surface-400 text-sm">
                                {formatDate(song.last_played)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}