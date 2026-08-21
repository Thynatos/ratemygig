import { memo } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { SetlistWithSongs } from '@core/index'

interface SetlistCardProps {
    setlist: SetlistWithSongs
    /** Route for the whole row. */
    to?: string
    onClick?: () => void
}

/**
 * A setlist on the board: song count in the left slot, the first few songs in
 * the body, who wrote it down on the right.
 */
export const SetlistCard = memo(function SetlistCard({
    setlist,
    to,
    onClick,
}: SetlistCardProps) {
    const previewSongs = setlist.songs.slice(0, 4)
    const remaining = setlist.songs.length - previewSongs.length
    const author = sanitizeText(
        setlist.profile?.display_name || setlist.profile?.username || 'a gig-goer'
    )

    const body = (
        <>
            <span className="row-slot">
                <span className="date-slot">
                    <span className="date-slot-day">{setlist.songs.length}</span>
                    <span className="date-slot-mon">
                        {setlist.songs.length === 1 ? 'song' : 'songs'}
                    </span>
                </span>
            </span>

            <span className="row-body">
                <span className="flex items-center gap-2">
                    <span className="text-ui text-bone">Written down by {author}</span>
                    {setlist.source === 'verified' && (
                        <span className="voice-label text-strip border border-strip px-1.5 py-0.5">
                            Verified
                        </span>
                    )}
                </span>

                <ol className="mt-1 space-y-0.5">
                    {previewSongs.map(ss => (
                        <li
                            key={ss.id}
                            className="flex items-baseline gap-2 text-ui-sm text-bone-dim"
                        >
                            <span className="voice-data text-bone-faint w-5 text-right tabular-nums">
                                {ss.position}
                            </span>
                            <span className="truncate">
                                {sanitizeText(ss.song?.name ?? 'Unknown song')}
                            </span>
                            {ss.is_encore && (
                                <span className="voice-label text-strip shrink-0">Encore</span>
                            )}
                            {ss.is_debut && (
                                <span className="voice-label text-bone-faint shrink-0">Debut</span>
                            )}
                        </li>
                    ))}
                    {remaining > 0 && (
                        <li className="voice-label text-bone-faint pl-7">
                            +{remaining} more
                        </li>
                    )}
                </ol>
            </span>

            <span className="row-end">
                <span className="voice-label text-bone-faint">
                    {formatRelativeTime(setlist.updated_at)}
                </span>
            </span>
        </>
    )

    if (to) {
        return (
            <Link to={to} className="row row-interactive items-start">
                {body}
            </Link>
        )
    }

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="row row-interactive items-start text-left"
            >
                {body}
            </button>
        )
    }

    return <div className="row items-start">{body}</div>
})
