/**
 * Shared shapes and constants.
 *
 * This module deliberately imports nothing. Both contacts.ts and
 * validation.ts need these values, and if they imported them from each other
 * the two files would form a cycle -- which is exactly the bug this file was
 * created to fix.
 */

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export type Contact = {
  id: string
  user_id: string
  name: string
  company: string | null
  role: string | null
  met_where: string | null
  notes: string | null
  priority: Priority
  created_at: string
  updated_at: string
}

/** The fields a person actually types in. */
export type ContactDraft = {
  name: string
  company: string
  role: string
  met_where: string
  notes: string
  priority: Priority
}

export const EMPTY_DRAFT: ContactDraft = {
  name: '',
  company: '',
  role: '',
  met_where: '',
  notes: '',
  priority: 'medium',
}
