import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { FeatureErrorBoundary } from '@/shared/components/FeatureErrorBoundary'

// Eagerly loaded (landing / frequently visited)
import { DiscoverPage } from '@/features/events/pages/DiscoverPage'
import { VenuesPage } from '@/features/venues/pages/VenuesPage'
import { ArtistsPage } from '@/features/artists/pages/ArtistsPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { AboutPage } from '@/shared/pages/AboutPage'
import { PrivacyPage } from '@/shared/pages/PrivacyPage'
import { TermsPage } from '@/shared/pages/TermsPage'

// Lazy loaded (code-split)
const EventDetailPage = lazy(() => import('@/features/events/pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
const VenueDetailPage = lazy(() => import('@/features/venues/pages/VenueDetailPage').then(m => ({ default: m.VenueDetailPage })))
const TopVenuesPage = lazy(() => import('@/features/venues/pages/TopVenuesPage').then(m => ({ default: m.TopVenuesPage })))
const ArtistDetailPage = lazy(() => import('@/features/artists/pages/ArtistDetailPage').then(m => ({ default: m.ArtistDetailPage })))
const TopArtistsPage = lazy(() => import('@/features/artists/pages/TopArtistsPage').then(m => ({ default: m.TopArtistsPage })))
const PublicReviewPage = lazy(() => import('@/features/reviews/pages/PublicReviewPage').then(m => ({ default: m.PublicReviewPage })))
const PublicProfilePage = lazy(() => import('@/features/profile/pages/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })))
const FeedPage = lazy(() => import('@/features/feed/pages/FeedPage').then(m => ({ default: m.FeedPage })))
const MyGigsPage = lazy(() => import('@/features/reviews/pages/MyGigsPage').then(m => ({ default: m.MyGigsPage })))
const WriteReviewPage = lazy(() => import('@/features/reviews/pages/WriteReviewPage').then(m => ({ default: m.WriteReviewPage })))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const SetlistPage = lazy(() => import('@/features/setlists/pages/SetlistPage').then(m => ({ default: m.SetlistPage })))
const SongPage = lazy(() => import('@/features/setlists/pages/SongPage').then(m => ({ default: m.SongPage })))
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const ListPage = lazy(() => import('@/features/lists/pages/ListPage').then(m => ({ default: m.ListPage })))

function App() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-surface-950" />}>
            <Routes>
                {/* Public routes */}
                <Route element={<Layout />}>
                    <Route path="/" element={<FeatureErrorBoundary title="Discover"><DiscoverPage /></FeatureErrorBoundary>} />
                    <Route path="/events/:eventId" element={<FeatureErrorBoundary title="Event Details"><EventDetailPage /></FeatureErrorBoundary>} />
                    <Route path="/venues" element={<FeatureErrorBoundary title="Venues"><VenuesPage /></FeatureErrorBoundary>} />
                    <Route path="/venues/top" element={<FeatureErrorBoundary title="Top Venues"><TopVenuesPage /></FeatureErrorBoundary>} />
                    <Route path="/venues/:venueId" element={<FeatureErrorBoundary title="Venue Details"><VenueDetailPage /></FeatureErrorBoundary>} />
                    <Route path="/artists" element={<FeatureErrorBoundary title="Artists"><ArtistsPage /></FeatureErrorBoundary>} />
                    <Route path="/artists/top" element={<FeatureErrorBoundary title="Top Artists"><TopArtistsPage /></FeatureErrorBoundary>} />
                    <Route path="/artists/:artistId" element={<FeatureErrorBoundary title="Artist Details"><ArtistDetailPage /></FeatureErrorBoundary>} />
                    <Route path="/r/:reviewId" element={<FeatureErrorBoundary title="Review"><PublicReviewPage /></FeatureErrorBoundary>} />
                    <Route path="/u/:username" element={<FeatureErrorBoundary title="Profile"><PublicProfilePage /></FeatureErrorBoundary>} />
                    <Route path="/events/:eventId/setlist" element={<FeatureErrorBoundary title="Setlist"><SetlistPage /></FeatureErrorBoundary>} />
                    <Route path="/songs/:songId" element={<FeatureErrorBoundary title="Song"><SongPage /></FeatureErrorBoundary>} />
                    <Route path="/lists/:listId" element={<FeatureErrorBoundary title="List"><ListPage /></FeatureErrorBoundary>} />

                    {/* Legal pages */}
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/feed" element={<FeatureErrorBoundary title="Feed"><FeedPage /></FeatureErrorBoundary>} />
                        <Route path="/my-gigs" element={<FeatureErrorBoundary title="My Gigs"><MyGigsPage /></FeatureErrorBoundary>} />
                        <Route path="/notifications" element={<FeatureErrorBoundary title="Notifications"><NotificationsPage /></FeatureErrorBoundary>} />
                        <Route path="/review/:eventId" element={<FeatureErrorBoundary title="Write Review"><WriteReviewPage /></FeatureErrorBoundary>} />
                        <Route path="/review/:eventId/edit" element={<FeatureErrorBoundary title="Edit Review"><WriteReviewPage /></FeatureErrorBoundary>} />
                        <Route path="/profile" element={<FeatureErrorBoundary title="Profile"><ProfilePage /></FeatureErrorBoundary>} />
                    </Route>
                </Route>

                {/* Auth routes (no layout) */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    )
}

export default App