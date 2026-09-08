import { useState } from 'react'
import {
  EMPTY_DRAFT,
  PRIORITIES,
  createContact,
  type Contact,
  type ContactDraft,
  type Priority,
} from '@/lib/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateContact, type FieldErrors } from '@/lib/validation'

/** Inline message shown directly beneath the field it refers to. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                aria-invalid={Boolean(fieldErrors.name)}
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Chen"
              />
            <FieldError message={fieldErrors.name} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                aria-invalid={Boolean(fieldErrors.company)}
                value={draft.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Bain & Company"
              />
            <FieldError message={fieldErrors.company} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                aria-invalid={Boolean(fieldErrors.role)}
                value={draft.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Associate Partner"
              />
            <FieldError message={fieldErrors.role} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="met_where">Where we met</Label>
              <Input
                id="met_where"
                aria-invalid={Boolean(fieldErrors.met_where)}
                value={draft.met_where}
                onChange={(e) => set('met_where', e.target.value)}
                placeholder="Haas Consulting Club mixer"
              />
            <FieldError message={fieldErrors.met_where} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={draft.priority}
              onValueChange={(v) => set('priority', v as Priority)}
            >
              <SelectTrigger id="priority" className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.priority} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Offered to intro me to their recruiting lead."
              rows={3}
              aria-invalid={Boolean(fieldErrors.notes)}
            />
            <FieldError message={fieldErrors.notes} />
          </div>

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
