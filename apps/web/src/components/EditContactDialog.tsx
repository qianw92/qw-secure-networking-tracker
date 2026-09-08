import { useEffect, useState } from 'react'
import { toDraft, updateContact, type Contact, type ContactDraft } from '@/lib/contacts'
import { validateContact, type FieldErrors } from '@/lib/validation'
import { ContactFields } from '@/components/ContactFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  /** The contact being edited, or null when the dialog is closed. */
  contact: Contact | null
  onClose: () => void
  onSaved: () => void
}

export function EditContactDialog({ contact, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<ContactDraft | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Refill the form whenever a different contact is opened. Without this the
  // dialog would keep showing whichever contact was edited first.
  useEffect(() => {
    setDraft(contact ? toDraft(contact) : null)
    setFieldErrors({})
    setError(null)
  }, [contact])

  function set<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setFieldErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!contact || !draft) return

    setError(null)

    const check = validateContact(draft)
    if (!check.ok) {
      setFieldErrors(check.fieldErrors)
      return
    }

    setFieldErrors({})
    setSaving(true)

    try {
      await updateContact(contact.id, draft)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(contact)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
          <DialogDescription>
            Changes are saved to your own record only.
          </DialogDescription>
        </DialogHeader>

        {draft && (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <ContactFields
              draft={draft}
              fieldErrors={fieldErrors}
              onChange={set}
              idPrefix="edit"
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
