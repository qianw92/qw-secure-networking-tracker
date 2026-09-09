import cors from 'cors'
import express from 'express'
import { contactsRouter } from './routes/contacts.js'

/**
 * The Express application.
 *
 * Kept separate from server.ts so tests can import the app without opening a
 * network port, and so Vercel can wrap it as a serverless function.
 */
export function createApp() {
  const app = express()

  // Only these origins may call this API from a browser. Set in .env.local
  // locally and in Vercel's project settings in production.
  const allowed = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  app.use(
    cors({
      origin: allowed,
      // We authenticate with a Bearer token, not cookies, so the browser
      // never needs to send credentials cross-origin.
      credentials: false,
    }),
  )

  app.use(express.json({ limit: '64kb' }))

  // A person who clicks the backend URL lands here. Without this route the
  // root path returned a Vercel function crash, which looks like a broken
  // deployment rather than "this is an API, there are no pages here".
  app.get('/', (_req, res) => {
    res.json({
      service: 'Network Tracker API',
      description:
        'This is the backend. It serves JSON, not web pages. Open the app instead.',
      app: 'https://qw-network-tracker.vercel.app',
      endpoints: {
        'GET /health': 'liveness check',
        'GET /contacts': 'list your contacts (requires a signed-in token)',
        'POST /contacts': 'create a contact',
        'PATCH /contacts/:id': 'update one of your contacts',
        'DELETE /contacts/:id': 'delete one of your contacts',
      },
    })
  })

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'networking-tracker-api' })
  })

  app.use('/contacts', contactsRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Not found.' } })
  })

  // Last-resort handler. Never echo the underlying error to the client.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('[api] unhandled error:', err)
      res.status(500).json({ error: { message: 'Something went wrong.' } })
    },
  )

  return app
}
