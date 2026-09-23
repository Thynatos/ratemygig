import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createSetlistImportHandler } from './handler.ts'

// setlist-import: resolves a setlist.fm setlist URL/id into the import contract
// { artistName, eventDate, venueName, url, songs: [{ name, encore }] }.
//
// The setlist.fm key is an Edge Function secret (SETLISTFM_API_KEY) and never
// reaches the browser — the pattern later server-side-key work should follow.
// verify_jwt is off in config.toml, as Supabase recommends once a project uses
// publishable/secret API keys (the platform check only understands the legacy
// JWT-based keys); the handler instead requires a bearer token and verifies it
// here against Supabase Auth.

function clientApiKey(): string | undefined {
    // Newer projects expose a JSON map of publishable keys; older ones only the
    // legacy anon key. Either works as the apikey for an Auth getUser() call.
    const publishable = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
    if (publishable) {
        try {
            const keys = Object.values(JSON.parse(publishable) as Record<string, string>)
            if (typeof keys[0] === 'string' && keys[0]) return keys[0]
        } catch {
            // Malformed map: fall back to the legacy variable.
        }
    }
    return Deno.env.get('SUPABASE_ANON_KEY')
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const apiKey = clientApiKey()
const authClient =
    supabaseUrl && apiKey
        ? createClient(supabaseUrl, apiKey, {
              auth: { persistSession: false, autoRefreshToken: false },
          })
        : null

Deno.serve(
    createSetlistImportHandler({
        apiKey: Deno.env.get('SETLISTFM_API_KEY')?.trim() || undefined,
        verifyUser: async token => {
            if (!authClient) return false
            const { data, error } = await authClient.auth.getUser(token)
            return !error && data.user !== null
        },
        fetch: (url, init) => fetch(url, init),
        log: (message, detail) => console.error(`setlist-import: ${message}`, detail ?? ''),
    })
)
