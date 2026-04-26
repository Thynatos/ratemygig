import type { AttendanceStatus } from './common'
import type { Event } from './event'

export interface Attendance {
  id: string
  user_id: string
  event_id: string
  status: AttendanceStatus
  created_at: string
  event?: Event
}
