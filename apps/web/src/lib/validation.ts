import { z } from 'zod'
import { PRIORITIES } from '@/lib/types'

/**
 * Validation rules for a contact, written in human language.
 *
 * IMPORTANT: this copy runs in the browser, so it is a COURTESY, not a
 * defense. Anyone can open developer tools and skip it entirely. It exists
 * to give fast, clear feedback to honest users.
 *
 * The rules that actually protect the data live in two places the user
 * cannot reach:
 *   - apps/api/src/validation.ts  (the trusted server-side copy)
 *   - db/schema.sql               (CHECK constraints -- the absolute floor)
 *
 * These three are deliberately kept in agreement. If they ever disagree,
 * the database wins, because nothing can reach the table without it.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(200, 'Name must be 200 characters or fewer.'),

  company: z.string().trim().max(200, 'Company must be 200 characters or fewer.'),
  role: z.string().trim().max(200, 'Role must be 200 characters or fewer.'),
  met_where: z.string().trim().max(200, 'This must be 200 characters or fewer.'),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.'),

  priority: z.enum(PRIORITIES, {
    message: 'Priority must be high, medium, or low.',
  }),
})

/** field name -> first error message for that field */
export type FieldErrors = Partial<Record<string, string>>

export function validateContact(input: unknown):
  | { ok: true }
  | { ok: false; fieldErrors: FieldErrors } {
  const result = contactSchema.safeParse(input)
  if (result.success) return { ok: true }

  const fieldErrors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form')
    // Keep the first message per field; more than one is noise.
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return { ok: false, fieldErrors }
}

/**
 * Turn a raw database or network error into something a person can act on.
 *
 * Postgres reports a failed CHECK constraint like:
 *   new row for relation "contacts" violates check constraint "contacts_name_not_blank"
 *
 * That is useless to a user and it leaks our internal table and constraint
 * names, so we never show it. We match on the constraint name and substitute
 * the same wording the form uses.
 */
export function humanizeError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('contacts_name_not_blank')) {
    return 'Name is required.'
  }
  if (m.includes('contacts_priority_valid')) {
    return 'Priority must be high, medium, or low.'
  }
  if (m.includes('violates row-level security') || m.includes('permission denied')) {
    return 'You do not have access to that contact.'
  }
  if (m.includes('jwt') || m.includes('401') || m.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again.'
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  // Anything we did not anticipate: stay vague on purpose rather than
  // forwarding a raw database message to the browser.
  return 'Something went wrong saving that contact. Please try again.'
}
