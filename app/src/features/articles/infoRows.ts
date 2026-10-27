// The edits of an article's Info box rows (packages/shared/src/infobox.ts), each giving new rows. Pure (infoRows.test.ts).
import type { InfoRow, InfoRowKind } from '@map/shared'

const newId = () => crypto.randomUUID()

/** What a row is made as, in the Add info menu: a row's kind, with the list split into numbered and bulleted */
export type RowType = InfoRowKind | 'bullets'

/** The type a row is, the one its menu entry names */
// A list without `ordered` (saved before bulleted lists) is numbered
export const typeOf = (row: InfoRow): RowType => (row.kind === 'list' && row.ordered === false ? 'bullets' : row.kind)

/** An empty row of a type */
export function emptyRow(type: RowType, id: string = newId()): InfoRow {
  switch (type) {
    case 'value':
      return { id, label: '', kind: 'value', value: '' }
    case 'date':
      return { id, label: '', kind: 'date', value: '' }
    case 'period':
      return { id, label: '', kind: 'period', from: '', to: '' }
    case 'link':
      return { id, label: '', kind: 'link', text: '', url: '' }
    case 'list':
    case 'bullets':
      return { id, label: '', kind: 'list', items: [''], ordered: type === 'list' }
    case 'text':
      return { id, label: '', kind: 'text', text: '', bullets: false }
    case 'image':
      return { id, label: '', kind: 'image', image: null }
    case 'coordinates':
      return { id, label: '', kind: 'coordinates', lat: '', lng: '' }
  }
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

/** The words a row holds, one per line (a list's items, a text's lines, a value, a link's words and address…) */
function linesOf(row: InfoRow): string[] {
  const lines = (() => {
    switch (row.kind) {
      case 'image':
        return []
      case 'value':
      case 'date':
        return [row.value]
      case 'period':
        return [row.from, row.to]
      case 'link':
        return [row.text, row.url]
      case 'coordinates':
        return [row.lat, row.lng]
      case 'list':
        return row.items
      case 'text':
        return row.text.split('\n')
    }
  })()
  return lines.filter((l) => l.trim() !== '')
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const DEGREE = /^-?\d{1,3}(?:\.\d{1,8})?$/
const WEB = /^(?:https?|mailto):/i

/**
 * The same row as another type, keeping its label and what of its words still fits (lines become items and back; a date, a degree or
 * an address is kept only where it is one; a picture stays only between picture rows)
 */
export function changeKind(row: InfoRow, type: RowType): InfoRow {
  if (typeOf(row) === type) return row
  const lines = linesOf(row)
  const { id, label } = row
  const days = lines.filter((l) => DAY.test(l))
  switch (type) {
    case 'value':
      return { id, label, kind: 'value', value: lines[0] ?? '' }
    case 'date':
      return { id, label, kind: 'date', value: days[0] ?? '' }
    case 'period':
      return { id, label, kind: 'period', from: days[0] ?? '', to: days[1] ?? '' }
    case 'link': {
      const url = lines.find((l) => WEB.test(l)) ?? ''
      return { id, label, kind: 'link', text: lines.find((l) => l !== url) ?? '', url }
    }
    case 'list':
    case 'bullets':
      return { id, label, kind: 'list', items: lines.length ? lines : [''], ordered: type === 'list' }
    case 'text':
      return { id, label, kind: 'text', text: lines.join('\n'), bullets: typeOf(row) === 'bullets' }
    case 'image':
      return { id, label, kind: 'image', image: null }
    case 'coordinates': {
      const degrees = lines.filter((l) => DEGREE.test(l))
      return { id, label, kind: 'coordinates', lat: degrees[0] ?? '', lng: degrees[1] ?? '' }
    }
  }
}

/**
 * What a link row's address is once typed: '' (none), the address as it will be kept (a bare domain gets https://), or null while it is
 * not one yet (the server takes only http, https and mailto, so nothing else may be sent)
 */
export function normalizeAddress(text: string): string | null {
  const t = text.trim()
  if (t === '') return ''
  const url = WEB.test(t) ? t : /^[^\s/:]+\.[^\s/]{2,}/.test(t) ? `https://${t}` : null
  return url !== null && url.length <= 500 && !/\s/.test(url) ? url : null
}

/** A latitude or longitude once typed: '' (none), the number as it will be kept (a trailing dot goes), or null while it is not one yet */
export function normalizeDegree(text: string): string | null {
  const t = text.trim()
  if (t === '') return ''
  if (DEGREE.test(t)) return t
  return /^-?\d{1,3}\.$/.test(t) ? t.slice(0, -1) : null
}
