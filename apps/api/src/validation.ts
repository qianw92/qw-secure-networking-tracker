import { z } from 'zod'

/**
 * The trusted validation rules.
 *
 * This runs on the server, where the user cannot reach in and edit it. The
 * matching copy in apps/web is only there to give fast feedback in the
 * browser; it can be bypassed and is not relied upon here. Everything
 * arriving at these schemas is treated as untrusted.
 *
 * Below this sits one more layer that cannot be bypassed at all: the CHECK
 * constraints in db/schema.sql. If these rules and the database ever
 * disagree, the database wins.
 */

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

/** Trim, then treat an empty string as "not provided". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

/** The field rules, shared by create and update. */
const contactFields = {
  name: z
    .string({ message: 'Name is required.' })
    .trim()
    .min(1, 'Name is required.')
    .max(200, 'Name must be 200 characters or fewer.'),

  company: optionalText(200),
  role: optionalText(200),
  met_where: optionalText(200),
  notes: optionalText(2000),

  priority: z.enum(PRIORITIES, {
    message: 'Priority must be high, medium, or low.',
  }),
}

/**
 * Shape for creating a contact.
 *
 * Two deliberate choices:
 *
 * 1. There is no user_id field. z.object() drops keys it does not declare,
 *    so any user_id the caller sends is STRIPPED, not passed through.
 *    Ownership is set by the database via the column default
 *    auth.user_id(), so a hand-crafted request cannot create a row
 *    belonging to someone else.
 *
 * 2. id, created_at and updated_at are likewise absent and therefore
 *    dropped. The database owns those too.
 */
export const createContactSchema = z.object({
  ...contactFields,
  // Only create applies a default; see the note on update below.
  priority: contactFields.priority.default('medium'),
})

/**
 * Shape for editing a contact. Every field optional, but a field that IS
 * supplied must still be valid -- you cannot blank out a name by editing.
 *
 * Note this builds on contactFields rather than createContactSchema. If it
 * reused the create schema, the .default('medium') on priority would inject
 * a priority into an otherwise empty request, and the "no changes" check
 * below would never fire.
 */
export const updateContactSchema = z
  .object(contactFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'No changes were provided.',
  })

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>

export type ValidationFailure = {
  message: string
  fields: Record<string, string>
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ValidationFailure }

/** Run a schema and flatten its errors into one message per field. */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { ok: true, value: result.data }
  }

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'body')
    if (!fields[key]) fields[key] = issue.message
  }

  return {
    ok: false,
    error: {
      message: Object.values(fields)[0] ?? 'The submitted data is not valid.',
      fields,
    },
  }
}

export const validateCreate = (input: unknown) =>
  validate<CreateContactInput>(createContactSchema, input)

export const validateUpdate = (input: unknown) =>
  validate<UpdateContactInput>(updateContactSchema, input)
