import { useArtistSetlistStats } from '../api/stats'
import { Skeleton } from '@/shared/components/ui/Loading'

interface ArtistSetlistSummaryProps {
    artistId: string
}

export function ArtistSetlistSummary({ artistId }: ArtistSetlistSummaryProps) {
    const { data: stats, isLoading } = useArtistSetlistStats(artistId)

    if (isLoading) {
        return <Skeleton className="h-20 w-full" />
    }

    if (!stats || stats.setlist_count === 0) return null

    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.setlist_count}</div>
                <div className="text-xs text-surface-400 uppercase tracking-wide">Setlists</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.avg_song_count ?? 0}</div>
                <div className="text-xs text-surface-400 uppercase tracking-wide">Avg Length</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.total_unique_songs}</div>
                <div className="text-xs text-surface-400 uppercase tracking-wide">Unique Songs</div>
            </div>
        </div>
    )
}