import { PRIORITIES } from '@/lib/types'
import type { ListOptions } from '@/lib/contacts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

/**
 * Search, filter and sort controls.
 *
 * These only decide WHAT TO ASK FOR. The filtering and sorting themselves
 * happen in Postgres, via the API -- not by hiding rows already in the
 * browser. That matters: a filtered-out row is one the browser never
 * received, and Row Level Security means rows belonging to other people are
 * never sent in the first place.
 */

export type SortKey = 'created_at' | 'name' | 'priority' | 'company'

const SORT_LABELS: Record<SortKey, string> = {
  created_at: 'Date added',
  name: 'Name',
  priority: 'Priority',
  company: 'Company',
}

type Props = {
  value: ListOptions
  onChange: (next: ListOptions) => void
  /** Shown next to the heading so the count reflects the active filters. */
  resultCount: number | null
}

export function ContactFilters({ value, onChange, resultCount }: Props) {
  const priority = value.priority ?? 'all'
  const sort = (value.sort ?? 'created_at') as SortKey
  const dir = value.dir ?? 'desc'

  const isFiltered = Boolean(value.q?.trim()) || priority !== 'all'

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="search">Search by name</Label>
          <Input
            id="search"
            type="search"
            value={value.q ?? ''}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder="Search contacts…"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="filter-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(v) => onChange({ ...value, priority: v })}
          >
            <SelectTrigger id="filter-priority" className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sort-by">Sort by</Label>
          <Select
            value={sort}
            onValueChange={(v) => onChange({ ...value, sort: v as SortKey })}
          >
            <SelectTrigger id="sort-by" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ ...value, dir: dir === 'asc' ? 'desc' : 'asc' })}
          aria-label={`Sorted ${dir === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}
          title={dir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {dir === 'asc' ? '↑ Asc' : '↓ Desc'}
        </Button>
      </div>

      <div className="flex min-h-6 items-center gap-3 text-sm text-muted-foreground">
        {resultCount !== null && (
          <span>
            {resultCount} {resultCount === 1 ? 'contact' : 'contacts'}
            {isFiltered ? (resultCount === 1 ? ' matches your filters' : ' match your filters') : ''}
          </span>
        )}
        {isFiltered && (
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => onChange({ ...value, q: '', priority: 'all' })}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
