// The Dashboard's three columns: which lists they show, in which order. Recent, then every resource with a Dashboard surface
// (resources.config.ts), in the UI config's order. Pure apart from reading the registry (tested in columns.test.ts).
import { resourcesWith } from '../../resources/registry'

/** What a column shows: 'recent', or a resource's name (its list) */
export type ColumnId = string

export const COLUMN_COUNT = 3

/** The lists a column can show */
const LISTS: { id: ColumnId; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  ...resourcesWith('dashboard').map((r) => ({ id: r.name, label: r.ui.plural })),
]
const known = (id: unknown): id is ColumnId => typeof id === 'string' && LISTS.some((l) => l.id === id)

/** The first visit: Recent, Notes and Maps (the ones that exist), then the first lists */
export const DEFAULT_COLUMNS: ColumnId[] = [...new Set([...['recent', 'notes', 'maps'].filter(known), ...LISTS.map((l) => l.id)])].slice(0, COLUMN_COUNT)

/** Column i shows `choice`: if another column shows it, the two trade places; else it replaces column i */
export function pickColumn(columns: ColumnId[], i: number, choice: ColumnId): ColumnId[] {
  const at = columns.indexOf(choice)
  if (at === i) return columns
  const next = [...columns]
  if (at >= 0) next[at] = columns[i]
  next[i] = choice
  return next
}

/** Dragging: column `from` placed at `to`, the ones between shift over */
export function moveColumn(columns: ColumnId[], from: number, to: number): ColumnId[] {
  if (from === to) return columns
  const next = [...columns]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** The rows below the columns: every resource's list that is not shown as a column (Recent is only a column) */
export const sectionsBelow = (columns: ColumnId[]): ColumnId[] => LISTS.map((l) => l.id).filter((id) => id !== 'recent' && !columns.includes(id))

/**
 * Stored columns made valid: always COLUMN_COUNT, no duplicates; an unknown one (an older version's, a resource that is gone) is
 * replaced by the first default not shown yet
 */
export function validColumns(stored: unknown): ColumnId[] {
  const list = Array.isArray(stored) ? stored.slice(0, COLUMN_COUNT) : []
  const kept: (ColumnId | null)[] = list.map((id, i) => (known(id) && list.indexOf(id) === i ? id : null))
  while (kept.length < COLUMN_COUNT) kept.push(null)
  const spare = [...DEFAULT_COLUMNS, ...LISTS.map((l) => l.id)].filter((id) => !kept.includes(id))
  return kept.map((id) => id ?? spare.shift()!)
}

export type MenuEntry = {
  id: ColumnId
  label: string
  /** This column's own entry (shown, not clickable) */
  current: boolean
  /** Shown in another column (its number, 1-based) */
  inColumn?: number
}

/** The ⋯ menu of column i: the lists */
export function menuEntries(columns: ColumnId[], i: number): MenuEntry[] {
  return LISTS.map(({ id, label }) => {
    const at = columns.indexOf(id)
    return { id, label, current: at === i, inColumn: at >= 0 && at !== i ? at + 1 : undefined }
  })
}

/** A column's label */
export const columnLabel = (id: ColumnId) => LISTS.find((l) => l.id === id)?.label ?? id
