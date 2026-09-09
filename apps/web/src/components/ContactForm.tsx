import { useState } from 'react'
import { EMPTY_DRAFT, createContact, type Contact, type ContactDraft } from '@/lib/contacts'
import { validateContact, type FieldErrors } from '@/lib/validation'
import { ContactFields } from '@/components/ContactFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function ContactForm({ onCreated }: { onCreated: (c: Contact) => void }) {
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    // Clear this field's error the moment the user starts fixing it.
    setFieldErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    // Check before sending, so the user gets an answer instantly.
    // The API and the database check again; this copy is only for speed.
    const check = validateContact(draft)
    if (!check.ok) {
      setFieldErrors(check.fieldErrors)
      return
    }

    setFieldErrors({})
    setSaving(true)

    try {
      const created = await createContact(draft)
      setDraft(EMPTY_DRAFT)
      toast.success(`${created.name} added to your contacts.`)
      onCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this contact.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a contact</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <ContactFields
            draft={draft}
            fieldErrors={fieldErrors}
            onChange={set}
            idPrefix="add"
            disabled={saving}
          />

          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add contact'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
