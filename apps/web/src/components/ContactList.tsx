import { Fragment, useState } from 'react'
import type { Contact, ListOptions } from '@/lib/contacts'
import type { SortKey } from '@/components/ContactFilters'
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

/** "8 Sep 2026" -- short, unambiguous, and not locale-order dependent. */
function formatAdded(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * A column heading that sorts.
 *
 * Clicking a new column sorts by it; clicking the active column again
 * reverses the direction. The arrow shows which column is active and which
 * way it runs, so the control and its state are the same thing rather than
 * a button somewhere else that you have to correlate.
 */
function SortableHeader({
  label,
  column,
  sort,
  dir,
  onSort,
  align = 'left',
}: {
  label: string
  column: SortKey
  sort: SortKey
  dir: 'asc' | 'desc'
  onSort: (column: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sort === column
  const arrow = active ? (dir === 'asc' ? '↑' : '↓') : ''

  return (
    <th className={`px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-foreground/70"
        // Tells a screen reader how the column is currently sorted.
        aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        title={
          active
            ? `Sorted ${dir === 'asc' ? 'A→Z' : 'Z→A'}. Click to reverse.`
            : `Sort by ${label.toLowerCase()}`
        }
      >
        {label}
        <span className={active ? '' : 'text-muted-foreground/40'} aria-hidden="true">
          {arrow || '↕'}
        </span>
      </button>
    </th>
  )
}

/** One label/value pair in the expanded panel. */
function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap">{value?.trim() ? value : '—'}</dd>
    </div>
  )
}

type Props = {
  contacts: Contact[]
  loading: boolean
  error: string | null
  onRetry: () => void
  /** True when a search or priority filter is active. */
  filtered?: boolean
  onEdit: (c: Contact) => void
  onDelete: (c: Contact) => void
  /** Current sort, so the headers can show which column is active. */
  options: ListOptions
  onSort: (column: SortKey) => void
}

export function ContactList({
  contacts,
  loading,
  error,
  onRetry,
  filtered,
  onEdit,
  onDelete,
  options,
  onSort,
}: Props) {
  const sort = (options.sort ?? 'created_at') as SortKey
  const dir = options.dir ?? 'desc'

  // Which row is open. Only one at a time -- several expanded rows at once
  // makes the table harder to scan than the thing it is helping with.
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
              <p className="mt-1 text-xs text-muted-foreground">
                Added {formatAdded(c.created_at)}
              </p>
              {c.notes && <p className="mt-2 text-sm">{c.notes}</p>}

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(c)}
                >
                  Delete
                </Button>
              </div>
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
                <SortableHeader label="Name" column="name" sort={sort} dir={dir} onSort={onSort} />
                <SortableHeader label="Company" column="company" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Where we met</th>
                <SortableHeader label="Priority" column="priority" sort={sort} dir={dir} onSort={onSort} />
                <SortableHeader label="Added" column="created_at" sort={sort} dir={dir} onSort={onSort} />
                <th className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const open = expandedId === c.id
                return (
                <Fragment key={c.id}>
                <tr
                  onClick={() => setExpandedId(open ? null : c.id)}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {/* The real control, so this is reachable by keyboard.
                          The row click is a convenience on top of it. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedId(open ? null : c.id)
                        }}
                        aria-expanded={open}
                        aria-label={open ? `Hide details for ${c.name}` : `Show details for ${c.name}`}
                        className="text-muted-foreground transition-transform hover:text-foreground"
                      >
                        <span className={`inline-block ${open ? 'rotate-90' : ''}`}>›</span>
                      </button>
                      {c.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.role ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.met_where ?? '—'}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatAdded(c.created_at)}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(c)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(c)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>

                {open && (
                  <tr className="border-b bg-muted/30 last:border-0">
                    <td colSpan={7} className="px-4 py-4">
                      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Company" value={c.company} />
                        <Detail label="Role" value={c.role} />
                        <Detail label="Where we met" value={c.met_where} />
                        <Detail label="Priority" value={c.priority} />
                      </dl>
                      <div className="mt-4">
                        <Detail label="Notes" value={c.notes} />
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
