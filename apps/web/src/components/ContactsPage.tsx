import { useCallback, useEffect, useState } from 'react'
import { listContacts, type Contact } from '@/lib/contacts'
import { ContactForm } from '@/components/ContactForm'
import { ContactList } from '@/components/ContactList'

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setContacts(await listContacts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Runs once when the page opens -- this is what makes contacts survive a
  // browser refresh: on every load we re-fetch them from Postgres.
  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="grid gap-6">
      <ContactForm onCreated={(c) => setContacts((prev) => [c, ...prev])} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {loading || error
            ? 'Your contacts'
            : `Your contacts (${contacts.length})`}
        </h2>
        <ContactList
          contacts={contacts}
          loading={loading}
          error={error}
          onRetry={() => void load()}
        />
      </div>
    </div>
  )
}
