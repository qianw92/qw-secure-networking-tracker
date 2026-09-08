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

export function ContactForm({ onCreated }: { onCreated: (c: Contact) => void }) {
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
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
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Chen"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={draft.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Bain & Company"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={draft.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="Associate Partner"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="met_where">Where we met</Label>
              <Input
                id="met_where"
                value={draft.met_where}
                onChange={(e) => set('met_where', e.target.value)}
                placeholder="Haas Consulting Club mixer"
              />
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Offered to intro me to their recruiting lead."
              rows={3}
            />
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
