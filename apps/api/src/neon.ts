import { NeonPostgrestClient, fetchWithToken } from '@neondatabase/neon-js'

/**
 * Builds a Data API client that acts AS THE CALLER, by forwarding their
 * token.
 *
 * A fresh client per request is intentional. If we built one shared client
 * at startup, every user's queries would run under whichever token happened
 * to be attached -- a serious data-leak bug. One client per request keeps
 * each caller's identity, and therefore their RLS policies, separate.
 *
 * Note what is NOT here: any database password or connection string. This
 * service holds no database credential at all. It passes along the token the
 * browser already had, so there is nothing here to leak.
 */

const dataApiUrl = process.env.NEON_DATA_API_URL

if (!dataApiUrl) {
  throw new Error(
    'NEON_DATA_API_URL is not set. Copy apps/api/.env.example to .env.local.',
  )
}

export function clientForToken(accessToken: string) {
  return new NeonPostgrestClient({
    dataApiUrl: dataApiUrl as string,
    options: {
      global: {
        // fetchWithToken attaches "Authorization: Bearer <token>" to every
        // outgoing request. The token is resolved per request rather than
        // captured once, which is what keeps callers isolated from each other.
        fetch: fetchWithToken(async () => accessToken),
      },
    },
  })
}
