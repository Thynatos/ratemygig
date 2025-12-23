// Environment configuration with validation

interface Env {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    EVENTS_PROVIDER: 'mock' | 'ticketmaster'
    TICKETMASTER_API_KEY?: string
}

function getEnv(): Env {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const eventsProvider = (import.meta.env.VITE_EVENTS_PROVIDER as string) || 'mock'
    const ticketmasterApiKey = import.meta.env.VITE_TICKETMASTER_API_KEY as string | undefined

    // Validate required env vars in production
    if (import.meta.env.PROD) {
        if (!supabaseUrl) {
            throw new Error('VITE_SUPABASE_URL is required')
        }
        if (!supabaseAnonKey) {
            throw new Error('VITE_SUPABASE_ANON_KEY is required')
        }
    }

    return {
        SUPABASE_URL: supabaseUrl || 'http://localhost:54321',
        SUPABASE_ANON_KEY: supabaseAnonKey || 'mock-anon-key',
        EVENTS_PROVIDER: eventsProvider as 'mock' | 'ticketmaster',
        TICKETMASTER_API_KEY: ticketmasterApiKey,
    }
}

export const env = getEnv()

export const isProduction = import.meta.env.PROD
export const isDevelopment = import.meta.env.DEV
