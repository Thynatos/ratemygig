import { useArtistSetlistStats } from '../api/stats'
import { Skeleton } from '@/shared/components/ui/Loading'
import { Figure, FigureRail } from '@/shared/components/ui/Board'

interface ArtistSetlistSummaryProps {
    artistId: string
}

export function ArtistSetlistSummary({ artistId }: ArtistSetlistSummaryProps) {
    const { data: stats, isLoading } = useArtistSetlistStats(artistId)

    if (isLoading) {
        return <Skeleton className="h-24 w-full" />
    }

    if (!stats || stats.setlist_count === 0) return null

    return (
        <section>
            <h2 className="voice-label text-bone-dim mb-3">From the setlists</h2>
            <FigureRail className="sm:grid-cols-3">
                <Figure value={stats.setlist_count} label="Setlists written down" />
                <Figure value={stats.avg_song_count ?? 0} label="Songs in a typical night" />
                <Figure value={stats.total_unique_songs} label="Different songs played" />
            </FigureRail>
        </section>
    )
}
