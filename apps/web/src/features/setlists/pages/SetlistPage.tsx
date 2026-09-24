import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useEventSetlists, useDeleteSetlist } from '../api/setlists'
import { soleArtistId } from '../api/setlistImport'
import { useEvent, useEventArtists } from '@/features/events/api/events'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SetlistViewer } from '../components/SetlistViewer'
import { SetlistEditor } from '../components/SetlistEditor'
import { Button } from '@/shared/components/ui/Button'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import { formatDate } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { SetlistWithSongs } from '@core/index'

export function SetlistPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const { user } = useAuth()
    const { data: event, isLoading: isEventLoading } = useEvent(eventId!)
    const { data: eventArtists, isLoading: isArtistsLoading } = useEventArtists(eventId!)
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no setlists yet" (audit finding A13).
    const { data: setlistsData, isLoading, isError, refetch } = useEventSetlists(eventId!)
    const setlists = setlistsData ?? []
    const deleteSetlist = useDeleteSetlist()
    const [editingSetlist, setEditingSetlist] = useState<SetlistWithSongs | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const userSetlist = setlists.find(sl => sl.user_id === user?.id)

    if (isLoading) return <LoadingPage message="Opening the setlist" />

    // New songs are filed under the gig's artist, so the editor can't open
    // until the line-up is known; otherwise a slow lookup would save them unfiled.
    const addSetlist = (
        <Button
            onClick={() => setIsCreating(true)}
            isLoading={isEventLoading || isArtistsLoading}
            loadingLabel="Checking the line-up"
        >
            Add the setlist
        </Button>
    )

    const handleDelete = (setlistId: string) => {
        if (
            window.confirm('Delete this setlist? The song order goes with it and can\'t be recovered.')
        ) {
            deleteSetlist.mutate({ setlistId, eventId: eventId! })
        }
    }

    return (
        <div className="page page-body max-w-3xl">
            <Link
                to={`/events/${eventId}`}
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Back to the gig
            </Link>

            <BoardHeader
                strip={event ? formatDate(event.start_at, 'EEE d MMM yyyy') : undefined}
                title="What they played"
                lede={
                    event ? (
                        <>
                            {sanitizeText(event.name)} ·{' '}
                            {sanitizeText(event.venue?.name || 'Venue unknown')}
                        </>
                    ) : undefined
                }
                action={user && !userSetlist && !isCreating ? addSetlist : undefined}
            />

            {isCreating && (
                <div className="border border-rail bg-board p-4 mb-6">
                    <SetlistEditor
                        eventId={eventId!}
                        event={event}
                        artistId={soleArtistId(eventArtists ?? [], event?.lineup ?? [])}
                        onClose={() => setIsCreating(false)}
                    />
                </div>
            )}

            {editingSetlist && (
                <div className="border border-rail bg-board p-4 mb-6">
                    <SetlistEditor
                        eventId={eventId!}
                        existingSetlist={editingSetlist}
                        onClose={() => setEditingSetlist(null)}
                    />
                </div>
            )}

            {isError ? (
                <QueryErrorState title="Couldn't load the setlists" onRetry={() => refetch()} />
            ) : setlists.length === 0 && !isCreating ? (
                <EmptyState
                    title="Nobody wrote this one down"
                    body={
                        user
                            ? 'If you were there and remember the order, put it here — even a partial list helps.'
                            : 'Sign in to add the songs they played.'
                    }
                    action={
                        user ? addSetlist : (
                            <Link to="/login" className="btn-primary">
                                Sign in
                            </Link>
                        )
                    }
                />
            ) : (
                <div className="space-y-6">
                    {setlists.map(setlist => (
                        <SetlistViewer
                            key={setlist.id}
                            setlist={setlist}
                            isOwner={user?.id === setlist.user_id}
                            onEdit={
                                user?.id === setlist.user_id
                                    ? () => setEditingSetlist(setlist)
                                    : undefined
                            }
                            onDelete={
                                user?.id === setlist.user_id
                                    ? () => handleDelete(setlist.id)
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
