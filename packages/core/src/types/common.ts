export type AttendanceStatus = 'planned' | 'attended'

export type Provider = 'mock' | 'ticketmaster' | 'songkick' | 'bandsintown'

export interface TicketUrl {
  label: string
  url: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}
