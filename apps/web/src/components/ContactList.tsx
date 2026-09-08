import type { Contact } from '@/lib/contacts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        priorityStyles[priority] ?? priorityStyles.low
      }`}
    >
      {priority}
    </span>
  )
}

type Props = {
  contacts: Contact[]
  loading: boolean
  error: string | null
  onRetry: () => void
  /** True when a search or priority filter is active. */
  filtered?: boolean
}

export function ContactList({ contacts, loading, error, onRetry, filtered }: Props) {
  // LOADING
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading your contacts…
        </CardContent>
      </Card>
    )
  }

  // ERROR
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-10 text-center">
          <p className="font-medium">We couldn't load your contacts.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // EMPTY -- two different situations that deserve different wording.
  // "No contacts yet" is wrong and confusing when the list is empty only
  // because a filter excluded everything.
  if (contacts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          {filtered ? (
            <>
              <p className="font-medium">No matches</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No contacts match your search or filter. Try clearing them.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">No contacts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the first person you want to stay in touch with.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // POPULATED.
  // Cards on phones, a table on wider screens -- same data, two layouts.
  return (
    <>
      {/* Mobile */}
      <div className="grid gap-3 md:hidden">
        {contacts.map((c) => (
          <Card key={c.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[c.role, c.company].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <PriorityBadge priority={c.priority} />
              </div>
              {c.met_where && (
                <p className="mt-2 text-sm text-muted-foreground">Met at {c.met_where}</p>
              )}
              {c.notes && <p className="mt-2 text-sm">{c.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop */}
      <Card className="hidden overflow-hidden py-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Where we met</th>
                <th className="px-4 py-3 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.role ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.met_where ?? '—'}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={c.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
