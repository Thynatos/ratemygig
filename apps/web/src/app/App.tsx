import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'

// Pages
import { DiscoverPage } from '@/features/events/pages/DiscoverPage'
import { EventDetailPage } from '@/features/events/pages/EventDetailPage'
import { VenuesPage } from '@/features/venues/pages/VenuesPage'
import { VenueDetailPage } from '@/features/venues/pages/VenueDetailPage'
import { ArtistsPage } from '@/features/artists/pages/ArtistsPage'
import { ArtistDetailPage } from '@/features/artists/pages/ArtistDetailPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { MyGigsPage } from '@/features/reviews/pages/MyGigsPage'
import { WriteReviewPage } from '@/features/reviews/pages/WriteReviewPage'
import { PublicReviewPage } from '@/features/reviews/pages/PublicReviewPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { PublicProfilePage } from '@/features/profile/pages/PublicProfilePage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route element={<Layout />}>
                <Route path="/" element={<DiscoverPage />} />
                <Route path="/events/:eventId" element={<EventDetailPage />} />
                <Route path="/venues" element={<VenuesPage />} />
                <Route path="/venues/:venueId" element={<VenueDetailPage />} />
                <Route path="/artists" element={<ArtistsPage />} />
                <Route path="/artists/:artistId" element={<ArtistDetailPage />} />
                <Route path="/r/:reviewId" element={<PublicReviewPage />} />
                <Route path="/u/:username" element={<PublicProfilePage />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/my-gigs" element={<MyGigsPage />} />
                    <Route path="/review/:eventId" element={<WriteReviewPage />} />
                    <Route path="/review/:eventId/edit" element={<WriteReviewPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Route>
            </Route>

            {/* Auth routes (no layout) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    )
}

export default App
