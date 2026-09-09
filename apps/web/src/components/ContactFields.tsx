import { PRIORITIES, type ContactDraft, type Priority } from '@/lib/types'
import type { FieldErrors } from '@/lib/validation'
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

/**
 * The contact fields themselves, with no opinion about where they appear.
 *
 * Shared by the "add" card and the "edit" dialog so the two cannot drift
 * apart. A field added here shows up in both, already validated the same
 * way -- which is the point: two copies of this markup would eventually
 * disagree about something small and confusing.
 */

/** Inline message shown directly beneath the field it refers to. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

type Props = {
  draft: ContactDraft
  fieldErrors: FieldErrors
  onChange: <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => void
  /** Prefix so ids stay unique when the add form and edit dialog coexist. */
  idPrefix: string
  disabled?: boolean
  /**
   * Show example text in empty fields.
   *
   * On for the add form, where examples show what to type. Off when
   * editing: grey example text in an empty field reads as though the
   * contact actually has that company or role, and the only way to tell
   * is to notice the shade of grey.
   */
  showPlaceholders?: boolean
}

export function ContactFields({
  draft,
  fieldErrors,
  onChange,
  idPrefix,
  disabled,
  showPlaceholders = true,
}: Props) {
  const id = (name: string) => `${idPrefix}-${name}`
  const ph = (example: string) => (showPlaceholders ? example : undefined)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={id('name')}>
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={id('name')}
            value={draft.name}
            aria-invalid={Boolean(fieldErrors.name)}
            disabled={disabled}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={ph("Jane Chen")}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={id('company')}>Company</Label>
          <Input
            id={id('company')}
            value={draft.company}
            aria-invalid={Boolean(fieldErrors.company)}
            disabled={disabled}
            onChange={(e) => onChange('company', e.target.value)}
            placeholder={ph("Spotify")}
          />
          <FieldError message={fieldErrors.company} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={id('role')}>Role</Label>
          <Input
            id={id('role')}
            value={draft.role}
            aria-invalid={Boolean(fieldErrors.role)}
            disabled={disabled}
            onChange={(e) => onChange('role', e.target.value)}
            placeholder={ph("Group Product Manager")}
          />
          <FieldError message={fieldErrors.role} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={id('met_where')}>Where we met</Label>
          <Input
            id={id('met_where')}
            value={draft.met_where}
            aria-invalid={Boolean(fieldErrors.met_where)}
            disabled={disabled}
            onChange={(e) => onChange('met_where', e.target.value)}
            placeholder={ph("Haas Tech Club mixer")}
          />
          <FieldError message={fieldErrors.met_where} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={id('priority')}>Priority</Label>
        <Select
          value={draft.priority}
          disabled={disabled}
          onValueChange={(v) => onChange('priority', v as Priority)}
        >
          <SelectTrigger id={id('priority')} className="w-full sm:w-48">
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
        <Label htmlFor={id('notes')}>Notes</Label>
        <Textarea
          id={id('notes')}
          value={draft.notes}
          aria-invalid={Boolean(fieldErrors.notes)}
          disabled={disabled}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder={ph("Offered to intro me to their recruiting lead.")}
          rows={3}
        />
        <FieldError message={fieldErrors.notes} />
      </div>
    </>
  )
}
