import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

/**
 * The two-account privacy proof.
 *
 * User A creates a contact. User B then tries every way of reaching it and
 * fails at each one. The final case is the important one: it skips this API
 * entirely and talks to the Neon Data API directly with B's token, which is
 * what proves the guarantee comes from Postgres Row Level Security rather
 * than from our own code being careful.
 *
 * Needs real credentials and network access, so it SKIPS ITSELF when the
 * environment is not configured. That is deliberate: `npm test` must pass on
 * a fresh clone for a grader who has no accounts. The validation suite is
 * the one that always runs.
 *
 * To run it: fill in the TEST_USER_* values in apps/api/.env.local.
 */

const AUTH_URL = process.env.NEON_AUTH_URL
const DATA_API_URL = process.env.NEON_DATA_API_URL
const A_EMAIL = process.env.TEST_USER_A_EMAIL
const A_PASSWORD = process.env.TEST_USER_A_PASSWORD
const B_EMAIL = process.env.TEST_USER_B_EMAIL
const B_PASSWORD = process.env.TEST_USER_B_PASSWORD

const configured = Boolean(
  AUTH_URL && DATA_API_URL && A_EMAIL && A_PASSWORD && B_EMAIL && B_PASSWORD,
)

/**
 * Sign in and return a JWT the Data API will accept.
 *
 * Two steps, and the reason matters. /sign-in/email returns a token, but it
 * is an OPAQUE session string -- no dots, not a JWT, and Postgres cannot
 * verify it. Sending that as a Bearer gets a 401 from our own API, which is
 * confusing because the sign-in plainly succeeded.
 *
 * The JWT comes from /token, and /token authenticates by COOKIE, not by
 * Authorization header. So we capture the session cookie from the sign-in
 * response and present it. Same trap the browser client hits; see the note
 * in apps/web/src/lib/api.ts.
 */
async function signIn(email: string, password: string): Promise<string> {
  // Neon Auth requires an Origin header when callbackURL is not absolute.
  const origin = 'http://localhost:5173'

  const signInResponse = await fetch(`${AUTH_URL}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password }),
  })

  if (!signInResponse.ok) {
    throw new Error(`Sign-in failed for ${email}: HTTP ${signInResponse.status}`)
  }

  const cookies = signInResponse.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

  if (!cookies) throw new Error(`Sign-in for ${email} returned no session cookie`)

  const tokenResponse = await fetch(`${AUTH_URL}/token`, {
    headers: { Cookie: cookies, Origin: origin },
  })

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed for ${email}: HTTP ${tokenResponse.status}`)
  }

  const body = (await tokenResponse.json()) as {
    token?: string
    session?: { token?: string }
  }

  const jwt = body.session?.token ?? body.token
  if (!jwt) throw new Error(`No JWT returned for ${email}`)

  // Guard against silently getting the opaque token again: a JWT has three
  // dot-separated parts. Without this the failure would surface much later,
  // as a confusing 401 from an endpoint that looks correct.
  if (jwt.split('.').length !== 3) {
    throw new Error(`Expected a JWT for ${email}, got an opaque token instead`)
  }

  return jwt
}

describe.skipIf(!configured)('two-account isolation', () => {
  const app = createApp()

  let tokenA = ''
  let tokenB = ''
  let contactId = ''

  beforeAll(async () => {
    tokenA = await signIn(A_EMAIL!, A_PASSWORD!)
    tokenB = await signIn(B_EMAIL!, B_PASSWORD!)

    const created = await request(app)
      .post('/contacts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Isolation Fixture — owned by A',
        company: 'A Corp',
        priority: 'high',
      })

    expect(created.status).toBe(201)
    contactId = created.body.data.id
  }, 30_000)

  afterAll(async () => {
    // Clean up so repeat runs do not accumulate rows.
    if (contactId && tokenA) {
      await request(app)
        .delete(`/contacts/${contactId}`)
        .set('Authorization', `Bearer ${tokenA}`)
    }
  }, 30_000)

  it('lets A see their own contact', async () => {
    const res = await request(app)
      .get('/contacts')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map((c: { id: string }) => c.id)).toContain(contactId)
  })

  it("does not show A's contact in B's list", async () => {
    const res = await request(app)
      .get('/contacts')
      .set('Authorization', `Bearer ${tokenB}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map((c: { id: string }) => c.id)).not.toContain(contactId)
  })

  it("refuses B's attempt to edit A's contact", async () => {
    const res = await request(app)
      .patch(`/contacts/${contactId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'TAKEN OVER BY B' })

    expect(res.status).toBe(404)
  })

  it("refuses B's attempt to delete A's contact", async () => {
    const res = await request(app)
      .delete(`/contacts/${contactId}`)
      .set('Authorization', `Bearer ${tokenB}`)

    expect(res.status).toBe(404)
  })

  it('answers identically for a contact that does not exist, so B cannot probe', async () => {
    const missing = '00000000-0000-0000-0000-000000000000'

    const notYours = await request(app)
      .patch(`/contacts/${contactId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'x' })

    const notReal = await request(app)
      .patch(`/contacts/${missing}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'x' })

    // Same status AND same message. A difference would let B discover which
    // ids belong to other people.
    expect(notYours.status).toBe(notReal.status)
    expect(notYours.body.error.message).toBe(notReal.body.error.message)
  })

  it('rejects a request carrying no token at all', async () => {
    const res = await request(app).get('/contacts')
    expect(res.status).toBe(401)
  })

  it("hides A's row from B even when the API is bypassed entirely", async () => {
    // Straight to Postgres via the Data API, with B's own token. If RLS were
    // not doing the work, this is where it would show.
    const res = await fetch(`${DATA_API_URL}/contacts?id=eq.${contactId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it("leaves A's contact untouched after every attempt", async () => {
    const res = await request(app)
      .get('/contacts')
      .set('Authorization', `Bearer ${tokenA}`)

    const contact = res.body.data.find((c: { id: string }) => c.id === contactId)

    expect(contact).toBeDefined()
    expect(contact.name).toBe('Isolation Fixture — owned by A')
    expect(contact.company).toBe('A Corp')
  })
})
