import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Check, Edit, Star, Plus } from 'lucide-react'
import { useMyGigs } from '../api/reviews'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { EventCardSkeleton } from '@/shared/components/ui/Loading'
import { cn } from '@/shared/lib/utils'

type TabType = 'all' | 'planned' | 'attended'

export function MyGigsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const statusFilter = activeTab === 'all' ? undefined : activeTab
    const { data: gigs, isLoading } = useMyGigs(statusFilter)

    const tabs: { id: TabType; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'planned', label: 'Planned' },
        { id: 'attended', label: 'Attended' },
    ]

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="section-title flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-primary-400" />
                        My Gigs
                    </h1>
                    <p className="section-subtitle">Your concert history and upcoming shows</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-surface-800">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'tab',
                            activeTab === tab.id && 'active'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <EventCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && (!gigs || gigs.length === 0) && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Calendar className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No gigs yet</h3>
                        <p className="text-surface-400 mb-6">
                            {activeTab === 'planned'
                                ? "You haven't marked any events as planned"
                                : activeTab === 'attended'
                                    ? "You haven't marked any events as attended"
                                    : "Start exploring events and add them to your list"}
                        </p>
                        <Link to="/">
                            <Button>Discover Events</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Gigs List */}
            {!isLoading && gigs && gigs.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {gigs.map((gig) => {
                        const event = gig.event
                        if (!event) return null

                        const eventDate = new Date(event.start_at)
                        const hasReview = gig.review && gig.review.length > 0

                        return (
                            <Card key={gig.id} hoverable>
                                <CardContent className="p-5">
                                    <div className="flex gap-4">
                                        {/* Date Box */}
                                        <div className={cn(
                                            'flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center',
                                            gig.status === 'attended'
                                                ? 'bg-green-500/20 border border-green-500/30'
                                                : 'bg-primary-500/20 border border-primary-500/30'
                                        )}>
                                            <span className="text-xl font-bold text-white">
                                                {eventDate.getDate()}
                                            </span>
                                            <span className="text-xs uppercase text-surface-400 font-medium">
                                                {eventDate.toLocaleString('default', { month: 'short' })}
                                            </span>
                                        </div>

                                        {/* Event Info */}
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/events/${event.id}`}
                                                className="font-semibold text-white hover:text-primary-400 transition-colors line-clamp-1"
                                            >
                                                {event.name}
                                            </Link>
                                            <p className="text-sm text-surface-400 mt-1">
                                                {event.venue?.name} • {event.city}
                                            </p>

                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant={gig.status === 'attended' ? 'success' : 'primary'}>
                                                    {gig.status === 'attended' ? (
                                                        <><Check className="w-3 h-3 mr-1" /> Attended</>
                                                    ) : (
                                                        <>Planned</>
                                                    )}
                                                </Badge>

                                                {hasReview && (
                                                    <Badge variant="accent">
                                                        <Star className="w-3 h-3 mr-1" fill="currentColor" />
                                                        {gig.review[0].rating}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {gig.status === 'attended' && (
                                        <div className="mt-4 pt-4 border-t border-surface-800 flex justify-end gap-2">
                                            {hasReview ? (
                                                <Link to={`/review/${event.id}/edit`}>
                                                    <Button size="sm" variant="secondary">
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Edit Review
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Link to={`/review/${event.id}`}>
                                                    <Button size="sm">
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Write Review
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
