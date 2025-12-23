import { useParams, Link } from 'react-router-dom'
import { User, Star, Calendar, ChevronLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Badge } from '@/shared/components/ui/Badge'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { formatDate, formatRelativeTime } from '@/shared/lib/utils'

export function PublicProfilePage() {
    const { username } = useParams<{ username: string }>()

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['public-profile', username],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .eq('is_profile_public', true)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!username,
    })

    const { data: reviews = [] } = useQuery({
        queryKey: ['user-public-reviews', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          event:events(*,venue:venues(*))
        `)
                .eq('user_id', profile!.id)
                .eq('is_public', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!profile?.id,
    })

    if (profileLoading) return <LoadingPage message="Loading profile..." />

    if (!profile) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <User className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Profile not found</h2>
                        <p className="text-surface-400 mb-6">
                            This profile may be private or doesn't exist.
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
        <div className="page-container max-w-4xl mx-auto">
            {/* Profile Header */}
            <Card className="mb-8">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <Avatar
                            src={profile.avatar_url}
                            name={profile.display_name || profile.username}
                            size="xl"
                        />
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-display font-bold text-white mb-1">
                                {profile.display_name || profile.username}
                            </h1>
                            {profile.username && (
                                <p className="text-surface-400 mb-3">@{profile.username}</p>
                            )}
                            {profile.bio && (
                                <p className="text-surface-300 max-w-xl">{profile.bio}</p>
                            )}
                            <div className="mt-4 flex items-center justify-center md:justify-start gap-4">
                                <Badge variant="primary">
                                    {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews */}
            <section>
                <h2 className="section-title mb-6 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-400" />
                    Reviews
                </h2>

                {reviews.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Star className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                            <p className="text-surface-400">No public reviews yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <Card key={review.id}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {review.event && (
                                                <Link
                                                    to={`/events/${review.event.id}`}
                                                    className="font-semibold text-white hover:text-primary-400 transition-colors"
                                                >
                                                    {review.event.name}
                                                </Link>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                                                {review.event && (
                                                    <>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {formatDate(review.event.start_at, 'MMM d, yyyy')}
                                                        </span>
                                                        {review.event.venue && (
                                                            <span>
                                                                {review.event.venue.name}, {review.event.city}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <RatingDisplay rating={review.rating} />
                                    </div>

                                    {review.title && (
                                        <p className="mt-3 font-medium text-white">"{review.title}"</p>
                                    )}

                                    <p className="mt-2 text-surface-300 line-clamp-3">{review.body}</p>

                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-sm text-surface-500">
                                            {formatRelativeTime(review.created_at)}
                                        </span>
                                        <Link
                                            to={`/r/${review.id}`}
                                            className="text-sm text-primary-400 hover:text-primary-300"
                                        >
                                            Read more →
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

// Need to import Button for the not found state
import { Button } from '@/shared/components/ui/Button'
