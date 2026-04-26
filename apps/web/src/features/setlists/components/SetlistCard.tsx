import { memo } from 'react'
import { Music } from 'lucide-react'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import { Badge } from '@/shared/components/ui/Badge'
import type { SetlistWithSongs } from '@core/index'

interface SetlistCardProps {
    setlist: SetlistWithSongs
    onClick: () => void
}

export const SetlistCard = memo(function SetlistCard({ setlist, onClick }: SetlistCardProps) {
    const previewSongs = setlist.songs.slice(0, 4)
    const remaining = setlist.songs.length - previewSongs.length

    return (
        <div
            onClick={onClick}
            className="glass-card p-4 cursor-pointer transition-all duration-300 hover:border-primary-500/50 hover:shadow-glow"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary-400" />
                    {sanitizeText(setlist.profile?.display_name || setlist.profile?.username || 'Unknown')}'s Setlist
                </span>
                <Badge variant={setlist.source === 'verified' ? 'success' : 'surface'} className="text-xs">
                    {setlist.source === 'verified' ? 'Verified' : 'Manual'}
                </Badge>
            </div>

            <div className="space-y-1 mb-3">
                {previewSongs.map(ss => (
                    <div key={ss.id} className="flex items-center gap-2 text-sm text-surface-300">
                        <span className="text-surface-500 font-mono w-5 text-right">{ss.position}</span>
                        <span>{sanitizeText(ss.song?.name ?? 'Unknown')}</span>
                        {ss.is_encore && <Badge variant="accent" className="text-xs px-1.5 py-0.5">E</Badge>}
                        {ss.is_debut && <Badge variant="warning" className="text-xs px-1.5 py-0.5">Debut</Badge>}
                    </div>
                ))}
                {remaining > 0 && (
                    <span className="text-xs text-surface-500">...and {remaining} more</span>
                )}
            </div>

            <div className="flex items-center gap-2 text-surface-500 text-xs">
                <span>{setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'}</span>
                <span>•</span>
                <span>{formatRelativeTime(setlist.updated_at)}</span>
            </div>
        </div>
    )
})