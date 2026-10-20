// The Dashboard's three columns: which lists they show, in which order. Pure (tested in columns.test.ts).

/** What a column shows: Recent, a resource's list (Notes, Projects) or a list of the mock objects */
export type ColumnId = 'recent' | 'notes' | 'projects' | 'maps' | 'objects'

export const COLUMN_COUNT = 3
export const DEFAULT_COLUMNS: ColumnId[] = ['recent', 'notes', 'maps']

const FIXED: { id: ColumnId; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'notes', label: 'Notes' },
  { id: 'projects', label: 'Projects' },
  { id: 'maps', label: 'Maps' },
  { id: 'objects', label: 'Objects' },
]

/** The columns that are a resource's list (the server's): the resource's name */
export const RESOURCE_COLUMNS: Partial<Record<ColumnId, string>> = { projects: 'projects', notes: 'notes' }

/** Section kinds: shown below the columns (as a horizontal row) whenever they aren't a column */
export const isSection = (id: ColumnId) => id === 'projects' || id === 'notes' || id === 'objects'

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

/**
 * The rows below the columns: Projects, Notes and Objects, minus those shown as columns. A resource's items (projects, notes) only
 * live in their own list, as a column or as its own row (never in the other rows).
 */
export function sectionsBelow(columns: ColumnId[]): ColumnId[] {
  return (['projects', 'notes', 'objects'] as ColumnId[]).filter((id) => !columns.includes(id))
}

const isKnown = (id: unknown): id is ColumnId => typeof id === 'string' && FIXED.some((f) => f.id === id)

/** Stored columns made valid: always COLUMN_COUNT, no duplicates; an unknown one is replaced by the first default not shown yet */
export function validColumns(stored: unknown): ColumnId[] {
  const list = Array.isArray(stored) ? stored.slice(0, COLUMN_COUNT) : []
  const kept: (ColumnId | null)[] = list.map((id, i) => (isKnown(id) && list.indexOf(id) === i ? id : null))
  while (kept.length < COLUMN_COUNT) kept.push(null)
  const spare = [...DEFAULT_COLUMNS, ...FIXED.map((f) => f.id)].filter((id) => !kept.includes(id))
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
  return FIXED.map(({ id, label }) => {
    const at = columns.indexOf(id)
    return { id, label, current: at === i, inColumn: at >= 0 && at !== i ? at + 1 : undefined }
  })
}

/** A column's label */
export const columnLabel = (id: ColumnId) => FIXED.find((f) => f.id === id)?.label ?? id
