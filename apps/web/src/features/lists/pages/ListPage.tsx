import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useList, useDeleteList } from '@/features/lists/api/lists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Avatar } from '@/shared/components/ui/Avatar'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { BoardHeader, DateSlot, EmptyState } from '@/shared/components/ui/Board'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

export function ListPage() {
    const { listId } = useParams<{ listId: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { data: list, isLoading, error } = useList(listId!)
    const deleteList = useDeleteList()
    const isOwner = list ? user?.id === list.user_id : false

    if (isLoading) return <LoadingPage message="Opening the list" />

    if (error || !list) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such list"
                    body="This list is private, has been deleted, or the link is wrong."
                    action={
                        <Link to="/" className="btn-secondary">
                            See what's on
                        </Link>
                    }
                />
            </div>
        )
    }

    const owner = list.profile
        ? sanitizeText(list.profile.display_name || list.profile.username || 'a gig-goer')
        : null

    return (
        <div className="page page-body max-w-3xl">
            <Link
                to="/"
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                What's on
            </Link>

            <BoardHeader
                strip={`${list.items.length} ${list.items.length === 1 ? 'gig' : 'gigs'}`}
                title={sanitizeText(list.name)}
                lede={list.description ? sanitizeText(list.description) : undefined}
                action={
                    isOwner ? (
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (
                                    window.confirm(
                                        'Delete this list? The gigs stay on the board; only the list goes.'
                                    )
                                ) {
                                    deleteList.mutate(list.id, {
                                        onSuccess: () => navigate('/'),
                                    })
                                }
                            }}
                            isLoading={deleteList.isPending}
                            loadingLabel="Deleting the list"
                        >
                            Delete list
                        </Button>
                    ) : undefined
                }
            >
                <div className="flex flex-wrap items-center gap-3">
                    {list.profile && owner && (
                        <span className="flex items-center gap-2">
                            <Avatar src={list.profile.avatar_url} name={owner} size="sm" />
                            <span className="text-ui-sm text-bone-dim">
                                Kept by{' '}
                                {list.profile.username ? (
                                    <Link
                                        to={`/u/${list.profile.username}`}
                                        className="text-bone hover:text-strip"
                                    >
                                        {owner}
                                    </Link>
                                ) : (
                                    <span className="text-bone">{owner}</span>
                                )}
                            </span>
                        </span>
                    )}
                    <span className="voice-label text-bone-faint">
                        {list.is_public ? 'Public list' : 'Private list'} · made{' '}
                        {formatRelativeTime(list.created_at)}
                    </span>
                </div>
            </BoardHeader>

            {list.items.length === 0 ? (
                <EmptyState
                    title="Nothing on this list yet"
                    body={
                        isOwner
                            ? 'Open any gig and press “Add to list” to put it here.'
                            : 'Nothing has been added to this list.'
                    }
                    action={
                        isOwner ? (
                            <Link to="/" className="btn-primary">
                                Find something to add
                            </Link>
                        ) : undefined
                    }
                />
            ) : (
                <ol className="rail-list">
                    {list.items.map(item => (
                        <li key={item.id}>
                            <Link
                                to={`/events/${item.event_id}`}
                                className="row row-interactive items-start"
                            >
                                <span className="row-slot">
                                    {item.event ? (
                                        <DateSlot date={item.event.start_at} />
                                    ) : (
                                        <span className="voice-label text-bone-faint">Gig</span>
                                    )}
                                </span>

                                <span className="row-body">
                                    <span className="row-title">
                                        {sanitizeText(item.event?.name || 'Unknown gig')}
                                    </span>
                                    {item.event?.venue && (
                                        <span className="row-meta">
                                            {sanitizeText(item.event.venue.name)} ·{' '}
                                            {sanitizeText(item.event.city)}
                                        </span>
                                    )}
                                    {item.notes && (
                                        <span className="text-ui-sm text-bone-faint">
                                            {sanitizeText(item.notes)}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}
