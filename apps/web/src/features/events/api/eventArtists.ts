import { supabase } from '@/shared/lib/supabase'

export const eventArtistKeys = {
    all: ['event-artists'] as const,
    byEvent: (eventId: string) => [...eventArtistKeys.all, eventId] as const,
}

export interface EventArtistRef {
    id: string
    name: string
}

type ArtistEmbed = { id: string; name: string }

export interface EventArtistRow {
    billing_order: number | null
    artist: ArtistEmbed | ArtistEmbed[] | null
}

/** Flattens `event_artists` rows (already in billing order) to the artists they link. */
export function mapEventArtistRows(rows: EventArtistRow[]): EventArtistRef[] {
    return rows.flatMap(row => {
        const artist = Array.isArray(row.artist) ? row.artist[0] : row.artist
        return artist ? [{ id: artist.id, name: artist.name }] : []
    })
}

/** The event's line-up with artist ids, headliner first. */
export async function fetchEventArtists(eventId: string): Promise<EventArtistRef[]> {
    const { data, error } = await supabase
        .from('event_artists')
        .select('billing_order, artist:artists(id, name)')
        .eq('event_id', eventId)
        .order('billing_order', { ascending: true, nullsFirst: false })

    if (error) throw error
    return mapEventArtistRows((data ?? []) as unknown as EventArtistRow[])
}
