// Environment configuration with validation

export type EventsProviderMode = 'mock' | 'ticketmaster' | 'all'

interface Env {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    EVENTS_PROVIDER: EventsProviderMode
    TICKETMASTER_API_KEY?: string
}

function getEnv(): Env {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const rawProvider = ((import.meta.env.VITE_EVENTS_PROVIDER as string) || 'mock').toLowerCase()
    const eventsProvider: EventsProviderMode =
        rawProvider === 'ticketmaster' ? 'ticketmaster' : rawProvider === 'all' ? 'all' : 'mock'
    const ticketmasterApiKey = import.meta.env.VITE_TICKETMASTER_API_KEY as string | undefined

    if (import.meta.env.PROD) {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('Supabase credentials not configured. Auth features will be disabled.')
        }
    }

    return {
        SUPABASE_URL: supabaseUrl || 'http://localhost:54321',
        SUPABASE_ANON_KEY: supabaseAnonKey || 'mock-anon-key',
        EVENTS_PROVIDER: eventsProvider,
        TICKETMASTER_API_KEY: ticketmasterApiKey,
    }
}

export const env = getEnv()

/** True when real Supabase credentials are set (not placeholder dev defaults). */
export function isSupabaseConfigured(): boolean {
    const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
    const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
    if (!url || !key) return false
    if (key === 'mock-anon-key' || key === 'your-anon-key-here') return false
    if (url.includes('your-project.supabase.co')) return false
    return true
}

export const isProduction = import.meta.env.PROD
export const isDevelopment = import.meta.env.DEV
