import { Globe, Lock, ListMusic } from 'lucide-react'
import type { List, Event } from '@core/index'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { formatRelativeTime } from '@/shared/lib/utils'

interface ListWithItemCount extends List {
    item_count: number
    preview_events?: Pick<Event, 'id' | 'name'>[]
}

interface ListCardProps {
    list: ListWithItemCount
    onClick: () => void
}

export function ListCard({ list, onClick }: ListCardProps) {
    return (
        <Card hoverable onClick={onClick}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white truncate">{list.name}</h3>
                            {list.is_public ? (
                                <Globe className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                            ) : (
                                <Lock className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                            )}
                        </div>

                        {list.description && (
                            <p className="text-sm text-surface-400 mt-1 line-clamp-2">
                                {list.description}
                            </p>
                        )}

                        <div className="flex items-center gap-3 mt-3">
                            <Badge variant="surface">
                                <ListMusic className="w-3 h-3 mr-1" />
                                {list.item_count} {list.item_count === 1 ? 'event' : 'events'}
                            </Badge>
                            <span className="text-xs text-surface-500">
                                {formatRelativeTime(list.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
