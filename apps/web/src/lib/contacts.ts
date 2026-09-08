import { client } from '@/lib/neon'
import { humanizeError } from '@/lib/validation'
import type { Contact, ContactDraft } from '@/lib/types'

// Re-exported so components can keep importing these from one place.
export { PRIORITIES, EMPTY_DRAFT } from '@/lib/types'
export type { Contact, ContactDraft, Priority } from '@/lib/types'

/**
 * Every read and write of contacts goes through this file.
 *
 * Keeping data access in one place means that when we add the separate
 * Express backend later, only this file changes -- the UI components keep
 * calling listContacts() and createContact() exactly as they do now.
 */

/** Turn "" into null so the database stores absent values consistently. */
function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Fetch the signed-in user's contacts, newest first.
 *
 * Note there is no "where user_id = me" here. We never ask for it, because
 * Row Level Security applies that filter inside Postgres on every query.
 * Even a bug in this file cannot leak another user's rows.
 */
export async function listContacts(): Promise<Contact[]> {
  const { data, error } = await client
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(humanizeError(error.message))
  return (data ?? []) as Contact[]
}

/**
 * Create a contact.
 *
 * We deliberately do NOT send user_id. The database fills it in from the
 * signed-in user's token via the column default auth.user_id(). That is what
 * makes it impossible to create a row owned by someone else.
 */
export async function createContact(draft: ContactDraft): Promise<Contact> {
  const { data, error } = await client
    .from('contacts')
    .insert({
      name: draft.name.trim(),
      company: blankToNull(draft.company),
      role: blankToNull(draft.role),
      met_where: blankToNull(draft.met_where),
      notes: blankToNull(draft.notes),
      priority: draft.priority,
    })
    .select()

  if (error) throw new Error(humanizeError(error.message))

  const created = (data as Contact[] | null)?.[0]
  if (!created) throw new Error('The contact was not saved. Please try again.')
  return created
}
