import { apiFetch } from '@/lib/api'
import type { Contact, ContactDraft } from '@/lib/types'

// Re-exported so components can keep importing these from one place.
export { PRIORITIES, EMPTY_DRAFT } from '@/lib/types'
export type { Contact, ContactDraft, Priority } from '@/lib/types'

/**
 * Every read and write of contacts goes through this file.
 *
 * These calls used to go straight to the Neon Data API. They now go to
 * apps/api instead, which validates the input before touching the database.
 * Because all data access was already in this one file, the components did
 * not change at all -- ContactForm and ContactList still call the same
 * functions with the same arguments.
 *
 * What did NOT change is who enforces ownership. The API forwards the user's
 * own token to Postgres, so Row Level Security still decides which rows they
 * can see. Notice there is still no "where user_id = me" anywhere in this
 * file, or in the API. The database applies it, every time.
 */

/** Options for listing. All optional; the API defaults them. */
export type ListOptions = {
  sort?: 'created_at' | 'name' | 'priority' | 'company'
  dir?: 'asc' | 'desc'
  priority?: string
  q?: string
}

export async function listContacts(options: ListOptions = {}): Promise<Contact[]> {
  const params = new URLSearchParams()
  if (options.sort) params.set('sort', options.sort)
  if (options.dir) params.set('dir', options.dir)
  if (options.priority && options.priority !== 'all') {
    params.set('priority', options.priority)
  }
  if (options.q?.trim()) params.set('q', options.q.trim())

  const query = params.toString()
  const data = await apiFetch<Contact[]>(`/contacts${query ? `?${query}` : ''}`)
  return data ?? []
}

/**
 * Create a contact.
 *
 * We send only what the person typed. There is no user_id here, and if one
 * were added it would be stripped by the API's schema and overridden by the
 * database's auth.user_id() default. Ownership is not the browser's to decide.
 */
export async function createContact(draft: ContactDraft): Promise<Contact> {
  const created = await apiFetch<Contact>('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      name: draft.name,
      company: draft.company,
      role: draft.role,
      met_where: draft.met_where,
      notes: draft.notes,
      priority: draft.priority,
    }),
  })

  if (!created) throw new Error('The contact was not saved. Please try again.')
  return created
}
