/**
 * Vercel entry point.
 *
 * Vercel does not run a long-lived server; it invokes a function per
 * request. Exporting the Express app lets Vercel wrap it, while server.ts
 * remains the way to run it locally.
 */
import { createApp } from '../src/app.js'

export default createApp()
