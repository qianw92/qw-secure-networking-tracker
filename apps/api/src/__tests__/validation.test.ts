import { describe, expect, it } from 'vitest'
import { validateCreate, validateUpdate } from '../validation.js'

/**
 * Tests for the trusted, server-side validation rules.
 *
 * These run with no database, no network and no credentials, so anyone who
 * clones this repository can run `npm test` and see them pass.
 */

const valid = {
  name: 'Priya Raman',
  company: 'McKinsey & Company',
  role: 'Engagement Manager',
  met_where: 'Haas Tech Club panel',
  notes: 'Follow up in October.',
  priority: 'high',
}

describe('createContactSchema — required fields', () => {
  it('accepts a complete, valid contact', () => {
    const result = validateCreate(valid)
    expect(result.ok).toBe(true)
  })

  it('rejects a missing name', () => {
    const result = validateCreate({ ...valid, name: undefined })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fields.name).toBe('Name is required.')
  })

  it('rejects an empty name', () => {
    const result = validateCreate({ ...valid, name: '' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fields.name).toBe('Name is required.')
  })

  it('rejects a name that is only whitespace', () => {
    // The important case: it looks filled in, but it is not.
    const result = validateCreate({ ...valid, name: '   ' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fields.name).toBe('Name is required.')
  })

  it('trims surrounding whitespace from an otherwise valid name', () => {
    const result = validateCreate({ ...valid, name: '  Jane Chen  ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('Jane Chen')
  })

  it('rejects a name longer than 200 characters', () => {
    const result = validateCreate({ ...valid, name: 'a'.repeat(201) })
    expect(result.ok).toBe(false)
  })
})

describe('createContactSchema — priority', () => {
  it.each(['high', 'medium', 'low'])('accepts "%s"', (priority) => {
    const result = validateCreate({ ...valid, priority })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.priority).toBe(priority)
  })

  it('rejects a priority outside the allowed three', () => {
    const result = validateCreate({ ...valid, priority: 'urgent' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fields.priority).toBe('Priority must be high, medium, or low.')
  })

  it('rejects a priority in the wrong case', () => {
    const result = validateCreate({ ...valid, priority: 'HIGH' })
    expect(result.ok).toBe(false)
  })

  it('defaults to medium when priority is omitted', () => {
    const { priority: _omitted, ...withoutPriority } = valid
    const result = validateCreate(withoutPriority)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.priority).toBe('medium')
  })
})

describe('createContactSchema — ownership cannot be forged', () => {
  it('strips a client-supplied user_id', () => {
    // A hand-crafted request trying to create a row owned by someone else.
    const result = validateCreate({ ...valid, user_id: 'some-other-users-id' })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // The field never survives validation, so it is never sent to the
    // database, so the auth.user_id() column default decides ownership.
    expect(result.value).not.toHaveProperty('user_id')
  })

  it('strips a client-supplied id and timestamps', () => {
    const result = validateCreate({
      ...valid,
      id: 'a-chosen-id',
      created_at: '1999-01-01T00:00:00Z',
      updated_at: '1999-01-01T00:00:00Z',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).not.toHaveProperty('id')
    expect(result.value).not.toHaveProperty('created_at')
    expect(result.value).not.toHaveProperty('updated_at')
  })
})

describe('createContactSchema — optional fields', () => {
  it('accepts a contact with only a name', () => {
    const result = validateCreate({ name: 'Solo Contact' })
    expect(result.ok).toBe(true)
  })

  it('converts blank optional fields to null rather than empty strings', () => {
    const result = validateCreate({ name: 'Jane Chen', company: '   ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.company).toBeNull()
  })
})

describe('updateContactSchema — editing', () => {
  it('accepts a partial update', () => {
    const result = validateUpdate({ priority: 'low' })
    expect(result.ok).toBe(true)
  })

  it('still rejects a blank name on edit', () => {
    // You must not be able to erase a name by editing it away.
    const result = validateUpdate({ name: '  ' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fields.name).toBe('Name is required.')
  })

  it('still rejects an invalid priority on edit', () => {
    const result = validateUpdate({ priority: 'urgent' })
    expect(result.ok).toBe(false)
  })

  it('rejects an empty update', () => {
    const result = validateUpdate({})
    expect(result.ok).toBe(false)
  })

  it('strips a client-supplied user_id on edit', () => {
    // This is the "cannot give my row to someone else" case at the API layer.
    // The database enforces it too, via the WITH CHECK clause on the update
    // policy in db/schema.sql.
    const result = validateUpdate({ name: 'Jane Chen', user_id: 'someone-else' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).not.toHaveProperty('user_id')
  })
})
