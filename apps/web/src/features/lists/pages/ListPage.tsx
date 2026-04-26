import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Globe, Lock, MapPin, Calendar, Music, ExternalLink } from 'lucide-react'
import { useList, useDeleteList } from '@/features/lists/api/lists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Avatar } from '@/shared/components/ui/Avatar'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { formatDate, formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

export function ListPage() {
    const { listId } = useParams<{ listId: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { data: list, isLoading, error } = useList(listId!)
    const deleteList = useDeleteList()
    const isOwner = list ? user?.id === list.user_id : false

    if (isLoading) return <LoadingPage message="Loading list..." />

    if (error || !list) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <Music className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">List not found</h2>
                        <p className="text-surface-400 mb-6">
                            This list may be private or has been deleted.
                        </p>
                        <Link to="/">
                            <Button variant="secondary">Discover Events</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="page-container max-w-3xl mx-auto">
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                Discover Events
            </Link>

            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-2xl font-display font-bold text-white">{sanitizeText(list.name)}</h1>
                                <Badge variant="surface">
                                    {list.is_public ? (
                                        <><Globe className="w-3 h-3 mr-1" /> Public</>
                                    ) : (
                                        <><Lock className="w-3 h-3 mr-1" /> Private</>
                                    )}
                                </Badge>
                            </div>

                            {list.description && (
                                <p className="text-surface-300">{sanitizeText(list.description)}</p>
                            )}

                            <div className="flex items-center gap-3 mt-4">
                                {list.profile && (
                                    <div className="flex items-center gap-2">
                                        <Avatar
                                            src={list.profile.avatar_url}
                                            name={list.profile.display_name || list.profile.username}
                                            size="sm"
                                        />
                                        <span className="text-sm text-surface-400">
                                            {list.profile.display_name || list.profile.username}
                                        </span>
                                    </div>
                                )}
                                <span className="text-sm text-surface-500">
                                    {formatRelativeTime(list.created_at)}
                                </span>
                            </div>
                        </div>

                        {isOwner && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                    if (window.confirm('Delete this list?')) {
                                        deleteList.mutate(list.id, {
                                            onSuccess: () => navigate('/'),
                                        })
                                    }
                                }}
                                disabled={deleteList.isPending}
                            >
                                Delete
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {list.items.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Music className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                        <p className="text-surface-400">
                            This list is empty. Add events from any event page.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {list.items.map((item, index) => (
                        <Link key={item.id} to={`/events/${item.event_id}`}>
                            <Card hoverable>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-sm font-bold text-primary-400">{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">
                                                {item.event?.name || 'Unknown Event'}
                                            </h3>
                                            {item.event && (
                                                <div className="flex flex-wrap gap-3 mt-1 text-xs text-surface-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(item.event.start_at, 'MMM d, yyyy')}
                                                    </span>
                                                    {item.event.venue && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {sanitizeText(item.event.venue.name)}, {sanitizeText(item.event.city)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {item.notes && (
                                                <p className="text-sm text-surface-300 mt-2">{sanitizeText(item.notes)}</p>
                                            )}
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-surface-500 shrink-0 mt-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
