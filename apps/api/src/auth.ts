import type { NextFunction, Request, Response } from 'express'

/**
 * Pulls the caller's login token off the request.
 *
 * We do NOT verify the signature here. That is deliberate: the token is
 * forwarded to the Neon Data API, which validates it against Neon's public
 * keys and rejects anything forged. Row Level Security then decides which
 * rows the caller may touch.
 *
 * So this middleware is a fast rejection for obviously unauthenticated
 * requests, not the security boundary. The boundary is Postgres.
 *
 * (A future hardening step would verify the signature here too, using `jose`
 * against Neon's JWKS URL, so bad tokens never leave our network.)
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      accessToken?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({
      error: { message: 'You must be signed in to do that.' },
    })
  }

  req.accessToken = token
  next()
}
