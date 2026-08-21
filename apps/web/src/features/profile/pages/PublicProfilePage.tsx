import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { Avatar } from '@/shared/components/ui/Avatar'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { DateSlot, EmptyState } from '@/shared/components/ui/Board'
import { GigStatsCard } from '../components/GigStatsCard'
import { formatRelativeTime, cn } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import { FollowUserButton } from '../components/FollowUserButton'
import type { Profile } from '@core/index'

type TabType = 'reviews' | 'lists'

interface PublicListRow {
    id: string
    name: string
    description: string | null
    created_at: string
    list_items: { count: number }[]
}

export function PublicProfilePage() {
    const { username } = useParams<{ username: string }>()
    // The tab lives in the URL so a profile view is linkable.
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab: TabType = searchParams.get('tab') === 'lists' ? 'lists' : 'reviews'
    const setActiveTab = (tab: TabType) => {
        setSearchParams(tab === 'reviews' ? {} : { tab }, { replace: true })
    }

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
            return data as Profile
        },
        enabled: !!username,
    })

    // No `= []` defaults: failed queries must surface as error states, not
    // masquerade as empty profiles (audit finding A13).
    const {
        data: reviewsData,
        isError: reviewsError,
        refetch: refetchReviews,
    } = useQuery({
        queryKey: ['user-public-reviews', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reviews')
                .select(
                    `
          *,
          event:events(*,venue:venues(*))
        `
                )
                .eq('user_id', profile!.id)
                .eq('is_public', true)
                .eq('status', 'published')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!profile?.id,
    })

    const reviews = reviewsData ?? []

    const {
        data: listsData,
        isError: listsError,
        refetch: refetchLists,
    } = useQuery({
        queryKey: ['user-public-lists', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lists')
                .select('*, list_items(count)')
                .eq('user_id', profile!.id)
                .eq('is_public', true)
                .order('created_at', { ascending: false })

            if (error) throw error

            return ((data ?? []) as PublicListRow[]).map(row => ({
                ...row,
                item_count: row.list_items?.[0]?.count ?? 0,
            }))
        },
        enabled: !!profile?.id,
    })

    const lists = listsData ?? []

    if (profileLoading) return <LoadingPage message="Opening the profile" />

    if (!profile) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such profile"
                    body="This profile is private, or the username is wrong."
                    action={
                        <Link to="/" className="btn-secondary">
                            See what's on
                        </Link>
                    }
                />
            </div>
        )
    }

    const name = sanitizeText(profile.display_name || profile.username || 'A gig-goer')
    const showListsTab = lists.length > 0
    const socialLinks = [
        profile.website_url && {
            href: profile.website_url.startsWith('http')
                ? profile.website_url
                : `https://${profile.website_url}`,
            label: 'Website',
        },
        profile.twitter_handle && {
            href: `https://twitter.com/${profile.twitter_handle}`,
            label: `@${sanitizeText(profile.twitter_handle)}`,
        },
        profile.instagram_handle && {
            href: `https://instagram.com/${profile.instagram_handle}`,
            label: `@${sanitizeText(profile.instagram_handle)} on Instagram`,
        },
    ].filter(Boolean) as { href: string; label: string }[]

    return (
        <div className="page page-body max-w-4xl">
            <header className="board-header">
                <div className="flex flex-wrap items-start gap-5">
                    <Avatar src={profile.avatar_url} name={name} size="xl" />

                    <div className="min-w-0 flex-1">
                        <h1 className="voice-board text-board-lg text-bone text-balance">
                            {name}
                        </h1>
                        {profile.username && (
                            <p
                                translate="no"
                                className="voice-data text-ui-sm text-bone-faint mt-1.5"
                            >
                                @{sanitizeText(profile.username)}
                            </p>
                        )}
                        {profile.bio && (
                            <p className="mt-3 text-ui text-bone-dim max-w-[60ch]">
                                {sanitizeText(profile.bio)}
                            </p>
                        )}

                        {socialLinks.length > 0 && (
                            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                {socialLinks.map(link => (
                                    <li key={link.href}>
                                        <a
                                            href={link.href}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            className="voice-label text-bone-dim hover:text-strip underline decoration-rail-strong"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <FollowUserButton userId={profile.id} />
                </div>

                <div className="mt-6">
                    <GigStatsCard userId={profile.id} />
                </div>
            </header>

            <div className="tab-rail mb-4" role="tablist" aria-label="Profile sections">
                <button
                    type="button"
                    role="tab"
                    id="tab-reviews"
                    aria-selected={activeTab === 'reviews'}
                    aria-controls="profile-panel"
                    onClick={() => setActiveTab('reviews')}
                    className={cn('tab', activeTab === 'reviews' && 'tab-active')}
                >
                    Reviews
                </button>
                {showListsTab && (
                    <button
                        type="button"
                        role="tab"
                        id="tab-lists"
                        aria-selected={activeTab === 'lists'}
                        aria-controls="profile-panel"
                        onClick={() => setActiveTab('lists')}
                        className={cn('tab', activeTab === 'lists' && 'tab-active')}
                    >
                        Lists <span className="tnum">{lists.length}</span>
                    </button>
                )}
            </div>

            <div id="profile-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
                {activeTab === 'reviews' &&
                    (reviewsError ? (
                        <QueryErrorState
                            title="Couldn't load their reviews"
                            onRetry={() => refetchReviews()}
                        />
                    ) : reviews.length === 0 ? (
                        <EmptyState
                            title="Nothing public yet"
                            body={`${name} hasn't published a review anyone else can read.`}
                        />
                    ) : (
                        <div className="rail-list">
                            {reviews.map(review => (
                                <article key={review.id} className="row items-start">
                                    <span className="row-slot">
                                        {review.event ? (
                                            <DateSlot date={review.event.start_at} />
                                        ) : (
                                            <span className="voice-label text-bone-faint">
                                                Review
                                            </span>
                                        )}
                                    </span>

                                    <span className="row-body">
                                        {review.event && (
                                            <Link
                                                to={`/events/${review.event.id}`}
                                                className="row-title hover:text-strip"
                                            >
                                                {sanitizeText(review.event.name)}
                                            </Link>
                                        )}
                                        {review.event?.venue && (
                                            <span className="row-meta">
                                                {sanitizeText(review.event.venue.name)} ·{' '}
                                                {sanitizeText(review.event.city)}
                                            </span>
                                        )}
                                        {review.title && (
                                            <span className="voice-slot text-ui text-bone mt-1">
                                                {sanitizeText(review.title)}
                                            </span>
                                        )}
                                        <span className="text-ui text-bone-dim line-clamp-3">
                                            {sanitizeText(review.body)}
                                        </span>
                                        <Link
                                            to={`/r/${review.id}`}
                                            className="voice-label text-bone-dim hover:text-strip mt-1"
                                        >
                                            Read it · {formatRelativeTime(review.created_at)}
                                        </Link>
                                    </span>

                                    <span className="row-end">
                                        <span className="flex items-center gap-2">
                                            <span className="voice-board tnum text-board-md text-strip leading-none">
                                                {review.rating.toFixed(1)}
                                            </span>
                                            <ScoreStrip value={review.rating} size="sm" />
                                        </span>
                                        <span className="sr-only">
                                            {review.rating} out of 5
                                        </span>
                                    </span>
                                </article>
                            ))}
                        </div>
                    ))}

                {activeTab === 'lists' &&
                    (listsError ? (
                        <QueryErrorState
                            title="Couldn't load their lists"
                            onRetry={() => refetchLists()}
                        />
                    ) : lists.length === 0 ? (
                        <EmptyState
                            title="No public lists"
                            body={`${name} hasn't shared a list.`}
                        />
                    ) : (
                        <ul className="rail-list">
                            {lists.map(list => (
                                <li key={list.id}>
                                    <Link to={`/lists/${list.id}`} className="row row-interactive">
                                        <span className="row-slot">
                                            <span className="date-slot">
                                                <span className="date-slot-day">
                                                    {list.item_count}
                                                </span>
                                                <span className="date-slot-mon">
                                                    {list.item_count === 1 ? 'gig' : 'gigs'}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="row-body">
                                            <span className="row-title">
                                                {sanitizeText(list.name)}
                                            </span>
                                            {list.description && (
                                                <span className="row-meta">
                                                    {sanitizeText(list.description)}
                                                </span>
                                            )}
                                            <span className="voice-label text-bone-faint">
                                                Made {formatRelativeTime(list.created_at)}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ))}
            </div>
        </div>
    )
}
