import { auth } from '@/lib/neon'

/**
 * The one place the browser talks to our backend.
 *
 * Why this exists: the app used to call the Neon Data API directly. It now
 * goes through apps/api instead, so that validation runs somewhere the user
 * cannot edit. Authentication still happens directly against Neon Auth --
 * only contact data takes this detour.
 */

const baseUrl = import.meta.env.NEXT_PUBLIC_API_BASE_URL

if (!baseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_BASE_URL. Copy apps/web/.env.example to .env.local.',
  )
}

/** Shape the API uses for every failure. */
type ApiError = {
  error?: { message?: string; fields?: Record<string, string> }
}

/**
 * Errors carrying per-field messages, so a form can show them next to the
 * field they belong to instead of as one lump at the top.
 */
export class ApiRequestError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.fields = fields
  }
}

/**
 * Response shape of the auth client's token() call.
 *
 * Typed by hand because the auth object is a Proxy: it manufactures a
 * function for ANY property name and turns the name into a request path.
 * That means TypeScript cannot see its real surface, and -- more dangerously
 * -- `typeof auth.anythingAtAll === 'function'` is always true. A misspelled
 * method does not fail at compile time or even at call time; it becomes an
 * HTTP request to a route that does not exist and returns 404.
 */
type TokenResponse = {
  data?: { session?: { token?: string } }
  error?: { message?: string } | null
}

/**
 * Fetch a fresh JWT for the signed-in user.
 *
 * Use token(), NOT getSession(). They return different things:
 *
 *   auth.token()       -> a signed JWT that Postgres can verify
 *   auth.getSession()  -> usually an opaque session string, which the
 *                         database cannot verify at all
 *
 * getSession() sometimes happens to hold the JWT once token() has populated
 * the cache, which makes it look correct in casual testing and then fail
 * later. Always ask for the token explicitly.
 *
 * Fetched per request rather than cached: these expire in about 14 minutes,
 * so a token held from sign-in would start failing while a tab sat open.
 */
async function currentToken(): Promise<string> {
  const result = (await (auth as unknown as {
    token: () => Promise<TokenResponse>
  }).token()) as TokenResponse

  const token = result?.data?.session?.token

  if (!token) {
    throw new ApiRequestError('Your session has expired. Please sign in again.', 401)
  }
  return token
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const token = await currentToken()

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    })
  } catch {
    // fetch() only rejects when the request never completed -- server down,
    // DNS failure, no network. An HTTP 500 is a resolved promise, not this.
    throw new ApiRequestError(
      'Could not reach the server. Check your connection and try again.',
      0,
    )
  }

  // 204 No Content, which DELETE returns on success.
  if (response.status === 204) return null

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // A response with no JSON body is only a problem if it also failed.
  }

  if (!response.ok) {
    const failure = (body as ApiError)?.error
    throw new ApiRequestError(
      failure?.message ?? 'Something went wrong. Please try again.',
      response.status,
      failure?.fields ?? {},
    )
  }

  return ((body as { data?: T })?.data ?? null) as T | null
}
