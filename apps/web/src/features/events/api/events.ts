// Barrel re-export — split into resolver, hooks, and attendance modules
export { eventKeys, resolveEvents, resolveEventsWithDeps, resolveEvent, resolveEventWithDeps, resolveCities, resolveCitiesWithDeps, mapEventRow } from './resolver'
export type { VenueRow, EventRow } from './resolver'
export { useEvents, useEvent, useCities } from './hooks'
export { useAttendance, useToggleAttendance, useRemoveAttendance } from './attendance'
export { eventArtistKeys, fetchEventArtists, mapEventArtistRows } from './eventArtists'
export type { EventArtistRef } from './eventArtists'
