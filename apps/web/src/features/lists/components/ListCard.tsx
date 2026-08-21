import { memo } from 'react'
import type { List, Event } from '@core/index'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

interface ListWithItemCount extends List {
    item_count: number
    preview_events?: Pick<Event, 'id' | 'name'>[]
}

interface ListCardProps {
    list: ListWithItemCount
    onClick: () => void
}

/** A list on the board: how many gigs in the slot, name and note in the body. */
export const ListCard = memo(function ListCard({ list, onClick }: ListCardProps) {
    return (
        <button type="button" onClick={onClick} className="row row-interactive items-start">
            <span className="row-slot">
                <span className="date-slot">
                    <span className="date-slot-day">{list.item_count}</span>
                    <span className="date-slot-mon">
                        {list.item_count === 1 ? 'gig' : 'gigs'}
                    </span>
                </span>
            </span>

            <span className="row-body">
                <span className="row-title">{sanitizeText(list.name)}</span>
                {list.description && (
                    <span className="row-meta line-clamp-2">
                        {sanitizeText(list.description)}
                    </span>
                )}
                <span className="voice-label text-bone-faint">
                    {list.is_public ? 'Public' : 'Private'} · made{' '}
                    {formatRelativeTime(list.created_at)}
                </span>
            </span>
        </button>
    )
})
