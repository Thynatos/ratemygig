import { Music, Star, Trash2, Edit3 } from 'lucide-react'
import { formatRelativeTime } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/ui/Badge'
import type { SetlistWithSongs } from '@core/index'

interface SetlistViewerProps {
    setlist: SetlistWithSongs
    isOwner?: boolean
    onEdit?: () => void
    onDelete?: () => void
}

export function SetlistViewer({ setlist, isOwner, onEdit, onDelete }: SetlistViewerProps) {
    const encoreSongs = setlist.songs.filter(s => s.is_encore)
    const mainSongs = setlist.songs.filter(s => !s.is_encore)

    const renderSong = (ss: SetlistWithSongs['songs'][number], displayPosition: number) => (
        <div key={ss.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-surface-800/50 transition-colors">
            <span className="text-surface-500 font-mono text-sm w-6 text-right shrink-0">{displayPosition}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{ss.song?.name ?? 'Unknown Song'}</span>
                    {ss.is_debut && <Badge variant="accent" className="text-xs px-2 py-0.5">Debut</Badge>}
                </div>
                {ss.notes && (
                    <p className="text-surface-400 text-sm italic mt-0.5">{ss.notes}</p>
                )}
            </div>
        </div>
    )

    let position = 0

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Music className="w-5 h-5 text-primary-400" />
                        Setlist by {setlist.profile?.display_name || setlist.profile?.username || 'Unknown'}
                    </h3>
                    <Badge variant={setlist.source === 'verified' ? 'success' : 'surface'}>
                        {setlist.source === 'verified' ? 'Verified' : 'Manual'}
                    </Badge>
                </div>
                {isOwner && (
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="text-surface-400 hover:text-primary-400 transition-colors p-1"
                                title="Edit setlist"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="text-surface-400 hover:text-red-400 transition-colors p-1"
                                title="Delete setlist"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {setlist.notes && (
                <p className="text-surface-300 text-sm italic">{setlist.notes}</p>
            )}

            <div className="space-y-0.5">
                {mainSongs.map(ss => {
                    position++
                    return renderSong(ss, position)
                })}

                {encoreSongs.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 pt-3 pb-1">
                            <Star className="w-4 h-4 text-accent-400" />
                            <span className="text-accent-400 font-medium text-sm">Encore</span>
                            <div className="flex-1 border-t border-accent-500/30" />
                        </div>
                        {encoreSongs.map(ss => {
                            position++
                            return renderSong(ss, position)
                        })}
                    </>
                )}
            </div>

            <div className="flex items-center gap-2 text-surface-500 text-sm pt-2 border-t border-surface-700/50">
                <span>{setlist.songs.length} {setlist.songs.length === 1 ? 'song' : 'songs'}</span>
                <span>•</span>
                <span>Last updated {formatRelativeTime(setlist.updated_at)}</span>
            </div>
        </div>
    )
}