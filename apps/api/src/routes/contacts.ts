import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { clientForToken } from '../neon.js'
import { validateCreate, validateUpdate } from '../validation.js'

export const contactsRouter = Router()

contactsRouter.use(requireAuth)

/**
 * Sort keys the client may ask for, mapped to the column actually used.
 *
 * Two of them do not sort by the column they name, on purpose:
 *
 *   priority -> priority_rank   Sorting the text would give high, low,
 *                               medium: alphabetical, and meaningless.
 *                               priority_rank is 1/2/3 so the order reads
 *                               high, medium, low.
 *
 *   name     -> name_sort       Postgres compares text by byte value, so
 *                               every capitalised name sorts before every
 *                               lowercase one and "alice" lands after "Zoe".
 *                               name_sort is the lowercased name.
 *
 * Both are generated columns: the database derives them from priority and
 * name, so they cannot drift out of step with the values they are based on.
 *
 * This is also an allowlist. Anything not listed here falls back to
 * created_at rather than being passed through to the database.
 */
const SORT_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  name: 'name_sort',
  priority: 'priority_rank',
  company: 'company',
}

/**
 * Never let a database message reach the client. It can disclose table and
 * constraint names, and occasionally row contents.
 */
function databaseError(res: import('express').Response, message: string) {
  const m = message.toLowerCase()

  if (m.includes('contacts_name_not_blank')) {
    return res.status(400).json({ error: { message: 'Name is required.' } })
  }
  if (m.includes('contacts_priority_valid')) {
    return res
      .status(400)
      .json({ error: { message: 'Priority must be high, medium, or low.' } })
  }
  if (m.includes('jwt') || m.includes('token') || m.includes('expired')) {
    return res
      .status(401)
      .json({ error: { message: 'Your session has expired. Please sign in again.' } })
  }

  console.error('[contacts] unexpected database error:', message)
  return res
    .status(500)
    .json({ error: { message: 'Something went wrong. Please try again.' } })
}

/** GET /contacts — the caller's own contacts. RLS does the filtering. */
contactsRouter.get('/', async (req, res) => {
  const db = clientForToken(req.accessToken!)

  const requested = String(req.query.sort)
  const sort = SORT_COLUMNS[requested] ?? 'created_at'
  const ascending = req.query.dir === 'asc'

  let query = db.from('contacts').select('*')

  // Optional filters.
  const priority = req.query.priority
  if (typeof priority === 'string' && priority !== 'all') {
    query = query.eq('priority', priority)
  }

  const search = req.query.q
  if (typeof search === 'string' && search.trim() !== '') {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  // Within one sort value the order would otherwise be arbitrary and could
  // change between requests, so break ties by name.
  const { data, error } =
    sort === 'name_sort'
      ? await query.order(sort, { ascending })
      : await query.order(sort, { ascending }).order('name_sort', { ascending: true })

  if (error) return databaseError(res, error.message)
  res.json({ data: data ?? [] })
})

/** POST /contacts */
contactsRouter.post('/', async (req, res) => {
  const check = validateCreate(req.body)
  if (!check.ok) {
    return res.status(400).json({ error: check.error })
  }

  // check.value cannot contain user_id -- the schema dropped it. The database
  // supplies ownership via the auth.user_id() column default.
  const db = clientForToken(req.accessToken!)
  const { data, error } = await db.from('contacts').insert(check.value).select()

  if (error) return databaseError(res, error.message)
  res.status(201).json({ data: (data as unknown[])?.[0] ?? null })
})

/** PATCH /contacts/:id */
contactsRouter.patch('/:id', async (req, res) => {
  const check = validateUpdate(req.body)
  if (!check.ok) {
    return res.status(400).json({ error: check.error })
  }

  const db = clientForToken(req.accessToken!)
  const { data, error } = await db
    .from('contacts')
    .update(check.value)
    .eq('id', req.params.id)
    .select()

  if (error) return databaseError(res, error.message)

  // Zero rows means the row either does not exist or is not the caller's.
  // We return the same 404 for both so the response cannot be used to probe
  // whether someone else's contact exists.
  const updated = (data as unknown[])?.[0]
  if (!updated) {
    return res.status(404).json({ error: { message: 'Contact not found.' } })
  }

  res.json({ data: updated })
})

/** DELETE /contacts/:id */
contactsRouter.delete('/:id', async (req, res) => {
  const db = clientForToken(req.accessToken!)
  const { data, error } = await db
    .from('contacts')
    .delete()
    .eq('id', req.params.id)
    .select()

  if (error) return databaseError(res, error.message)

  const deleted = (data as unknown[])?.[0]
  if (!deleted) {
    return res.status(404).json({ error: { message: 'Contact not found.' } })
  }

  res.status(204).end()
})
