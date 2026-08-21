import { z } from 'zod'

// ============================================
// Auth Schemas
// ============================================

export const emailSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

export type EmailInput = z.infer<typeof emailSchema>

// ============================================
// Profile Schemas
// ============================================

export const usernameSchema = z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional()
    .or(z.literal(''))

export const profileSchema = z.object({
    username: usernameSchema,
    display_name: z.string().max(100, 'Display name too long').optional(),
    bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
    is_profile_public: z.boolean(),
})

export type ProfileInput = z.infer<typeof profileSchema>

// ============================================
// Review Schemas
// ============================================

export const reviewSchema = z.object({
    rating: z
        .number()
        .min(1, 'Please select a rating')
        .max(5, 'Rating must be between 1 and 5'),
    title: z.string().max(200, 'Title too long').optional(),
    body: z
        .string()
        .min(10, 'Review must be at least 10 characters')
        .max(5000, 'Review must be 5000 characters or less'),
    isPublic: z.boolean(),
    tagIds: z.array(z.string().uuid()).optional(),
})

export type ReviewInput = z.infer<typeof reviewSchema>

// ============================================
// Event Schemas
// ============================================

export const eventFiltersSchema = z.object({
    city: z.string().optional(),
    query: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    venueId: z.string().uuid().optional(),
    artistId: z.string().uuid().optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
})

export type EventFiltersInput = z.infer<typeof eventFiltersSchema>

// ============================================
// Rating Filter Schemas
// ============================================

export const ratingFiltersSchema = z.object({
    city: z.string().optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    venueId: z.string().uuid().optional(),
    artistId: z.string().uuid().optional(),
})

export type RatingFiltersInput = z.infer<typeof ratingFiltersSchema>

// ============================================
// Attendance Schemas
// ============================================

export const attendanceStatusSchema = z.enum(['planned', 'attended'])

export const attendanceSchema = z.object({
    eventId: z.string().uuid(),
    status: attendanceStatusSchema,
})

export type AttendanceInput = z.infer<typeof attendanceSchema>

// ============================================
// Photo Upload Schemas
// ============================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_SIZE_MB = 10
export const MAX_PHOTOS_PER_REVIEW = 10

export const photoUploadSchema = z.object({
    file: z
        .instanceof(File)
        .refine(
            (file) => ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number]),
            'Only JPG, PNG and WebP images are allowed'
        )
        .refine(
            (file) => file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024,
            `File size must be less than ${MAX_IMAGE_SIZE_MB}MB`
        ),
})

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>

// ============================================
// URL / Link Schemas
// ============================================

export const ticketUrlSchema = z.object({
    label: z.string().min(1).max(100),
    url: z.string().url('Invalid URL'),
})

export type TicketUrlInput = z.infer<typeof ticketUrlSchema>

// ============================================
// API Response Validation
// ============================================

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
        data: z.array(itemSchema),
        count: z.number(),
        page: z.number(),
        pageSize: z.number(),
        hasMore: z.boolean(),
    })

// ============================================
// Database JSONB Parsing Schemas
// ============================================

export const ticketUrlsArraySchema = z
    .array(z.object({
        label: z.string(),
        url: z.string(),
    }))
    .catch([])

export const lineupArraySchema = z
    .array(z.string())
    .catch([])

// ============================================
// RPC Response Schemas
// ============================================

export const venueRatingSummarySchema = z.object({
    venue_id: z.string().uuid(),
    avg_rating: z.number().nullable(),
    count_reviews: z.number().int(),
    count_ratings: z.number().int(),
})

export const venueLeaderboardEntrySchema = z.object({
    venue_id: z.string().uuid(),
    venue_name: z.string(),
    city: z.string(),
    avg_rating: z.number(),
    count_reviews: z.number().int(),
})

export const artistRatingSummarySchema = z.object({
    artist_id: z.string().uuid(),
    avg_rating: z.number().nullable(),
    count_reviews: z.number().int(),
    count_ratings: z.number().int(),
})

export const artistLeaderboardEntrySchema = z.object({
    artist_id: z.string().uuid(),
    artist_name: z.string(),
    avg_rating: z.number(),
    count_reviews: z.number().int(),
})

export const recommendedEventSchema = z.object({
    event_id: z.string().uuid(),
    reason: z.enum(['followed_artist', 'followed_venue', 'attended_venue', 'popular', 'similar_taste']),
    priority: z.number(),
})

export const nearbyVenueSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    city: z.string(),
    country: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    distance_km: z.number(),
})

export const trendingEventSchema = z.object({
    event_id: z.string().uuid(),
    attendance_count: z.number().int(),
    review_count: z.number().int(),
    trending_score: z.number(),
})

export const friendsAttendanceRowSchema = z.object({
    event_id: z.string().uuid(),
    user_id: z.string().uuid(),
    display_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
})

export const artistSongStatsSchema = z.object({
    song_id: z.string().uuid(),
    song_name: z.string(),
    play_count: z.number().int(),
    last_played: z.string().datetime(),
})

export const artistSetlistStatsSchema = z.object({
    setlist_count: z.number().int(),
    avg_song_count: z.number(),
    total_unique_songs: z.number().int(),
})

export const songStatsEntrySchema = z.object({
    artist_id: z.string().uuid(),
    artist_name: z.string(),
    play_count: z.number().int(),
    first_played: z.string().datetime(),
    last_played: z.string().datetime(),
})

export const yearStatEntrySchema = z.object({
    name: z.string(),
    count: z.number().int(),
})

export const yearStatsSchema = z.object({
    gigs_attended: z.number().int(),
    reviews_written: z.number().int(),
    avg_rating_given: z.number(),
    photos_uploaded: z.number().int(),
    distinct_cities: z.number().int(),
    first_gig_date: z.string().datetime({ offset: true }).nullable(),
    last_gig_date: z.string().datetime({ offset: true }).nullable(),
    top_artists: z.array(yearStatEntrySchema),
    top_venues: z.array(yearStatEntrySchema),
})
