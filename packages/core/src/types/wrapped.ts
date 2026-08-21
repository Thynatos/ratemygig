export interface YearStatEntry {
  name: string
  count: number
}

export interface UserYearStats {
  gigs_attended: number
  reviews_written: number
  avg_rating_given: number
  photos_uploaded: number
  distinct_cities: number
  first_gig_date: string | null
  last_gig_date: string | null
  top_artists: YearStatEntry[]
  top_venues: YearStatEntry[]
}
