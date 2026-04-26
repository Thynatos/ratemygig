export interface Venue {
  id: string
  name: string
  city: string
  country: string
  lat: number | null
  lng: number | null
  provider_venue_id: string | null
  created_at: string
}
