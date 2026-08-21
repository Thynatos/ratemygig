import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { SetlistWithSongs } from '@core/index'

interface SetlistViewerProps {
    setlist: SetlistWithSongs
    isOwner?: boolean
    onEdit?: () => void
    onDelete?: () => void
}

/**
 * A setlist is already a numbered list on a rail — the taped A4 sheet on the
 * stage floor. Position in the left slot, song in the body, markers on the end.
 */
export function SetlistViewer({ setlist, isOwner, onEdit, onDelete }: SetlistViewerProps) {
    const encoreSongs = setlist.songs.filter(s => s.is_encore)
    const mainSongs = setlist.songs.filter(s => !s.is_encore)
    const author = sanitizeText(
        setlist.profile?.display_name || setlist.profile?.username || 'a gig-goer'
    )

    const renderSong = (ss: SetlistWithSongs['songs'][number], displayPosition: number) => (
        <li key={ss.id} className="row items-start">
            <span className="row-slot !w-10 sm:!w-12">
                <span className="voice-data text-ui text-bone-faint tabular-nums">
                    {String(displayPosition).padStart(2, '0')}
                </span>
            </span>
            <span className="row-body">
                <span className="text-ui text-bone">
                    {sanitizeText(ss.song?.name ?? 'Unknown song')}
                </span>
                {ss.notes && (
                    <span className="text-ui-sm text-bone-faint">{sanitizeText(ss.notes)}</span>
                )}
            </span>
            {ss.is_debut && (
                <span className="row-end">
                    <span className="voice-label text-strip">Debut</span>
                </span>
            )}
        </li>
    )

    let position = 0

    return (
        <section className="border border-rail bg-board">
            <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-rail">
                <h3 className="voice-label text-bone-dim">
                    Written down by <span className="text-bone">{author}</span>
                    {setlist.source === 'verified' && (
                        <span className="ml-2 text-strip">· Verified</span>
                    )}
                </h3>
                {isOwner && (
                    <div className="flex items-center gap-1.5">
                        {onEdit && (
                            <button type="button" onClick={onEdit} className="btn-ghost">
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="btn-ghost text-bone-faint hover:text-struck"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </header>

            {setlist.notes && (
                <p className="px-4 py-3 border-b border-rail text-ui-sm text-bone-dim">
                    {sanitizeText(setlist.notes)}
                </p>
            )}

            <ol className="rail-list border-y-0">
                {mainSongs.map(ss => {
                    position++
                    return renderSong(ss, position)
                })}

                {encoreSongs.length > 0 && (
                    <>
                        <li className="row bg-board-raised">
                            <span className="row-body">
                                <span className="voice-label text-strip">Encore</span>
                            </span>
                        </li>
                        {encoreSongs.map(ss => {
                            position++
                            return renderSong(ss, position)
                        })}
                    </>
                )}
            </ol>

            <footer className="px-4 py-2.5 border-t border-rail voice-label text-bone-faint">
                <span className="tnum">{setlist.songs.length}</span>{' '}
                {setlist.songs.length === 1 ? 'song' : 'songs'} · updated{' '}
                {formatRelativeTime(setlist.updated_at)}
            </footer>
        </section>
    )
}
