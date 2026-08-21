import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Music, Plus } from 'lucide-react'
import { useEventSetlists, useDeleteSetlist } from '../api/setlists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SetlistViewer } from '../components/SetlistViewer'
import { SetlistEditor } from '../components/SetlistEditor'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import type { SetlistWithSongs } from '@core/index'

export function SetlistPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const { user } = useAuth()
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no setlists yet" (audit finding A13).
    const { data: setlistsData, isLoading, isError, refetch } = useEventSetlists(eventId!)
    const setlists = setlistsData ?? []
    const deleteSetlist = useDeleteSetlist()
    const [editingSetlist, setEditingSetlist] = useState<SetlistWithSongs | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const userSetlist = setlists.find(sl => sl.user_id === user?.id)

    if (isLoading) return <LoadingPage message="Loading setlists..." />

    const handleDelete = (setlistId: string) => {
        if (window.confirm('Are you sure you want to delete this setlist?')) {
            deleteSetlist.mutate({ setlistId, eventId: eventId! })
        }
    }

    return (
        <div className="page-container">
            <Link
                to={`/events/${eventId}`}
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                ← Back to event
            </Link>

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                    <Music className="w-6 h-6 text-primary-400" />
                    Setlists
                </h1>
                {user && !userSetlist && !isCreating && (
                    <Button onClick={() => setIsCreating(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Setlist
                    </Button>
                )}
            </div>

            {isCreating && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <SetlistEditor
                            eventId={eventId!}
                            onClose={() => setIsCreating(false)}
                        />
                    </CardContent>
                </Card>
            )}

            {editingSetlist && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <SetlistEditor
                            eventId={eventId!}
                            existingSetlist={editingSetlist}
                            onClose={() => setEditingSetlist(null)}
                        />
                    </CardContent>
                </Card>
            )}

            {isError ? (
                <QueryErrorState
                    title="Couldn't load setlists"
                    onRetry={() => refetch()}
                />
            ) : setlists.length === 0 && !isCreating ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Music className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                        <p className="text-surface-400 mb-4">No setlists yet. Be the first to add one!</p>
                        {user && (
                            <Button onClick={() => setIsCreating(true)} variant="secondary">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Setlist
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {setlists.map(setlist => (
                        <Card key={setlist.id}>
                            <CardContent className="p-6">
                                <SetlistViewer
                                    setlist={setlist}
                                    isOwner={user?.id === setlist.user_id}
                                    onEdit={user?.id === setlist.user_id ? () => setEditingSetlist(setlist) : undefined}
                                    onDelete={user?.id === setlist.user_id ? () => handleDelete(setlist.id) : undefined}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}