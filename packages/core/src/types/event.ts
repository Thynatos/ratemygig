import type { Provider, TicketUrl } from './common'
import type { Venue } from './venue'

export interface Event {
  id: string
  provider: Provider
  provider_event_id: string
  name: string
  start_at: string
  city: string
  country: string
  venue_id: string | null
  venue?: Venue
  ticket_urls: TicketUrl[]
  lineup: string[]
  created_at: string
  updated_at: string
}

export interface EventFilters {
  city?: string
  country?: string
  from?: string
  to?: string
  query?: string
  venue_id?: string
  artist_id?: string
}
