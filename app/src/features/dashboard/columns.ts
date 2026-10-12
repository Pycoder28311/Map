// The Dashboard's three columns: which lists they show, in which order. Pure (tested in columns.test.ts).

/** What a column shows: a fixed list, or a project's children (a section's content, lifted up) */
export type ColumnId = 'recent' | 'notes' | 'maps' | 'projects' | 'orphans' | `project:${string}`

export const COLUMN_COUNT = 3
export const DEFAULT_COLUMNS: ColumnId[] = ['recent', 'notes', 'maps']

const FIXED: { id: ColumnId; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'notes', label: 'Notes' },
  { id: 'maps', label: 'Maps' },
  { id: 'projects', label: 'Projects' },
  { id: 'orphans', label: 'Orphans' },
]

export const projectColumn = (projectId: string): ColumnId => `project:${projectId}`
export const projectIdOf = (id: ColumnId) => (id.startsWith('project:') ? id.slice('project:'.length) : null)

/** Section kinds: shown below the columns (as a horizontal row) whenever they aren't a column */
export const isSection = (id: ColumnId) => id === 'orphans' || id.startsWith('project:')

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

/** The sections below the columns: Orphans, then each project, minus those shown as columns */
export function sectionsBelow(columns: ColumnId[], projectIds: string[]): ColumnId[] {
  return (['orphans', ...projectIds.map(projectColumn)] as ColumnId[]).filter((id) => !columns.includes(id))
}

const isKnown = (id: unknown, projectIds: string[]): id is ColumnId =>
  typeof id === 'string' && (FIXED.some((f) => f.id === id) || projectIds.includes(projectIdOf(id as ColumnId) ?? ''))

/**
 * Stored columns made valid: always COLUMN_COUNT, no duplicates; an unknown or gone one (e.g. a
 * deleted project) is replaced by the first default not shown yet
 */
export function validColumns(stored: unknown, projectIds: string[]): ColumnId[] {
  const list = Array.isArray(stored) ? stored.slice(0, COLUMN_COUNT) : []
  const kept: (ColumnId | null)[] = list.map((id, i) =>
    isKnown(id, projectIds) && list.indexOf(id) === i ? id : null,
  )
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

/** The ⋯ menu of column i: the fixed lists, then each project */
export function menuEntries(columns: ColumnId[], i: number, projects: { id: string; name: string }[]): MenuEntry[] {
  const all = [...FIXED, ...projects.map((p) => ({ id: projectColumn(p.id), label: p.name }))]
  return all.map(({ id, label }) => {
    const at = columns.indexOf(id)
    return { id, label, current: at === i, inColumn: at >= 0 && at !== i ? at + 1 : undefined }
  })
}

/** A column's label */
export function columnLabel(id: ColumnId, projects: { id: string; name: string }[]) {
  const projectId = projectIdOf(id)
  if (projectId) return projects.find((p) => p.id === projectId)?.name ?? 'Project'
  return FIXED.find((f) => f.id === id)?.label ?? id
}
