import { useCallback, useEffect, useRef, useState } from 'react'
import { listContacts, type Contact, type ListOptions } from '@/lib/contacts'
import { ContactForm } from '@/components/ContactForm'
import { ContactList } from '@/components/ContactList'
import { ContactFilters } from '@/components/ContactFilters'
import { EditContactDialog } from '@/components/EditContactDialog'
import { DeleteContactDialog } from '@/components/DeleteContactDialog'

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Which contact each dialog is acting on. null means closed.
  const [editing, setEditing] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)

  const [options, setOptions] = useState<ListOptions>({
    sort: 'created_at',
    dir: 'desc',
    priority: 'all',
    q: '',
  })

  // What the user typed vs what we have actually asked the server for.
  // Typing updates `options` immediately so the input stays responsive; the
  // request waits until they pause, so a 12-character search is one request
  // rather than twelve.
  const [debouncedQ, setDebouncedQ] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(options.q ?? ''), 300)
    return () => clearTimeout(timer)
  }, [options.q])

  const query: ListOptions = { ...options, q: debouncedQ }

  // Guards against a slow early request overwriting a newer one. Without
  // this, changing filters quickly can leave the list showing results for a
  // filter the user already moved off.
  const requestId = useRef(0)

  const load = useCallback(async (opts: ListOptions) => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const rows = await listContacts(opts)
      if (id === requestId.current) setContacts(rows)
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  // Re-runs whenever the filters change, and once when the page opens --
  // which is also what makes contacts survive a browser refresh.
  useEffect(() => {
    void load(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, options.sort, options.dir, options.priority, debouncedQ])

  function handleSort(column: NonNullable<ListOptions['sort']>) {
    setOptions((o) => {
      const current = o.sort ?? 'created_at'
      if (current === column) {
        return { ...o, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      }
      // A new column starts ascending -- except dates, where "most recent
      // first" is what people actually expect.
      return { ...o, sort: column, dir: column === 'created_at' ? 'desc' : 'asc' }
    })
  }

  return (
    <div className="grid gap-6">
      <ContactForm
        onCreated={() => {
          // Refetch rather than pushing onto the list: the new contact may
          // not belong under the current filters or sort order.
          void load(query)
        }}
      />

      <div className="grid gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Your contacts</h2>

        <ContactFilters
          value={options}
          onChange={setOptions}
          resultCount={loading || error ? null : contacts.length}
        />

        <ContactList
          contacts={contacts}
          loading={loading}
          error={error}
          onRetry={() => void load(query)}
          filtered={Boolean(debouncedQ.trim()) || (options.priority ?? 'all') !== 'all'}
          onEdit={setEditing}
          onDelete={setDeleting}
          options={options}
          onSort={handleSort}
        />
      </div>

      <EditContactDialog
        contact={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void load(query)}
      />

      <DeleteContactDialog
        contact={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => void load(query)}
      />
    </div>
  )
}
