// The edits of an article's Info box rows (packages/shared/src/infobox.ts), each giving new rows. Pure (infoRows.test.ts).
import type { InfoRow, InfoRowKind } from '@map/shared'

const newId = () => crypto.randomUUID()

/** An empty row of a kind */
export function emptyRow(kind: InfoRowKind, id: string = newId()): InfoRow {
  if (kind === 'value') return { id, label: '', kind, value: '' }
  if (kind === 'list') return { id, label: '', kind, items: [''] }
  return { id, label: '', kind, text: '', bullets: false }
}

/** A row put at `index` (the end when it is past it) */
export const insertRow = (rows: InfoRow[], index: number, row: InfoRow): InfoRow[] => [...rows.slice(0, index), row, ...rows.slice(index)]

export const removeRow = (rows: InfoRow[], id: string): InfoRow[] => rows.filter((r) => r.id !== id)

export const updateRow = (rows: InfoRow[], next: InfoRow): InfoRow[] => rows.map((r) => (r.id === next.id ? next : r))

/** One place up (-1) or down (+1); nothing changes at the ends */
export function moveRow(rows: InfoRow[], id: string, by: -1 | 1): InfoRow[] {
  const from = rows.findIndex((r) => r.id === id)
  const to = from + by
  if (from === -1 || to < 0 || to >= rows.length) return rows
  const next = [...rows]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/** The words a row holds, one per line (a list's items, a text's lines, a value) */
function linesOf(row: InfoRow): string[] {
  if (row.kind === 'value') return row.value ? [row.value] : []
  if (row.kind === 'list') return row.items.filter((i) => i !== '')
  return row.text.split('\n').filter((l) => l !== '')
}

/** The same row as another kind, keeping its label and its words (lines become items and back; a value takes the first line) */
export function changeKind(row: InfoRow, kind: InfoRowKind): InfoRow {
  if (row.kind === kind) return row
  const lines = linesOf(row)
  const { id, label } = row
  if (kind === 'value') return { id, label, kind, value: lines[0] ?? '' }
  if (kind === 'list') return { id, label, kind, items: lines.length ? lines : [''] }
  return { id, label, kind, text: lines.join('\n'), bullets: row.kind === 'list' }
}
