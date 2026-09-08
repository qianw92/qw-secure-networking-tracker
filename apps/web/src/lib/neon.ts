import { createClient } from '@neondatabase/neon-js'
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters'

/**
 * The single Neon client for the whole app.
 *
 * This is the "two-URL object form": one URL for authentication, one for data.
 * Both come from environment variables and both are public — they ship inside
 * the JavaScript bundle that every visitor downloads.
 *
 * That is safe on purpose. Knowing these URLs gets you nothing without a valid
 * signed-in token, and even with one, the Row Level Security policies in
 * db/schema.sql restrict every row to its owner. The database is the security
 * boundary, not the secrecy of these addresses.
 */

const authUrl = import.meta.env.NEXT_PUBLIC_NEON_AUTH_URL
const dataApiUrl = import.meta.env.NEXT_PUBLIC_NEON_DATA_API_URL

// Fail loudly at startup rather than mysteriously on first click.
if (!authUrl || !dataApiUrl) {
  throw new Error(
    'Missing Neon configuration. Copy apps/web/.env.example to .env.local and ' +
      'fill in NEXT_PUBLIC_NEON_AUTH_URL and NEXT_PUBLIC_NEON_DATA_API_URL.',
  )
}

export const client = createClient({
  auth: {
    url: authUrl,
    // The React adapter gives us the useSession() hook, so components
    // re-render automatically when the user signs in or out.
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: dataApiUrl,
  },
})

export const auth = client.auth
