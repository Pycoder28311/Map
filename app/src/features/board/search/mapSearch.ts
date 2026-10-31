// What the map's search finds (the left panel, MapSearchPanel): every point, and every line, area or shape that has a name. Pure
// (mapSearch.test.ts).
import { fold } from '../../search/search'
import { canSelect } from '../layers'
import { labelName, LABELS } from '../pointLabels'
import { descriptionPlain } from '../pointText'
import type { Board, BoardObject, PointLabel } from '../types'

/** The kinds a result can be (texts are names or notes of other things, not places) */
export type ResultKind = 'point' | 'border' | 'line' | 'shape'

/** One thing the search can find */
export type SearchEntry = {
  id: number
  kind: ResultKind
  name: string
  /** What it is: the point's label, or its kind ("Area", "Line"…) */
  type: string
  /** A point's label (the filter tabs of the labels) */
  label?: PointLabel
  /** Its description as plain words ('' when none) */
  description: string
}

/** A filter tab: everything, the points of one label, or one kind */
export type SearchFilter = { by: 'all' } | { by: 'label'; label: PointLabel } | { by: 'kind'; kind: Exclude<ResultKind, 'point'> }

const KIND_TYPE: Record<Exclude<ResultKind, 'point'>, string> = { border: 'Area', line: 'Line', shape: 'Shape' }

/** Its own name: the name it was given, or for an area the text that names it; '' when it has none */
function ownName(o: BoardObject, board: Board): string {
  if (o.name.trim()) return o.name.trim()
  if (o.kind !== 'border') return ''
  const text = board.objects.find((t) => t.kind === 'text' && t.isName && t.attach === o.id)
  return text?.kind === 'text' ? text.text.trim().split('\n')[0] : ''
}

/** Everything the search can find, in the board's order: the points (named or not) and the named lines, areas and shapes */
export function searchEntries(board: Board): SearchEntry[] {
  const out: SearchEntry[] = []
  for (const o of board.objects) {
    if (!canSelect(o) || o.kind === 'text') continue
    const name = ownName(o, board)
    if (o.kind === 'point') {
      out.push({ id: o.id, kind: 'point', name: name || 'Untitled point', type: labelName(o.label), label: o.label, description: descriptionPlain(o.description).trim() })
    } else if (name) {
      out.push({ id: o.id, kind: o.kind, name, type: KIND_TYPE[o.kind], description: o.kind === 'border' ? o.description.trim() : '' })
    }
  }
  return out
}

export const ALL: SearchFilter = { by: 'all' }

/** The tabs worth showing for these entries: All, each point label in use (in LABELS' order), then each kind in use */
export function filtersOf(entries: SearchEntry[]): { filter: SearchFilter; name: string; count: number }[] {
  const tabs: { filter: SearchFilter; name: string; count: number }[] = [{ filter: ALL, name: 'All', count: entries.length }]
  for (const l of LABELS) {
    const count = entries.filter((e) => e.label === l.id).length
    if (count > 0) tabs.push({ filter: { by: 'label', label: l.id }, name: l.name, count })
  }
  for (const kind of ['border', 'line', 'shape'] as const) {
    const count = entries.filter((e) => e.kind === kind).length
    if (count > 0) tabs.push({ filter: { by: 'kind', kind }, name: `${KIND_TYPE[kind]}s`, count })
  }
  return tabs
}

export const sameFilter = (a: SearchFilter, b: SearchFilter) =>
  a.by === b.by && (a.by !== 'label' || a.label === (b as typeof a).label) && (a.by !== 'kind' || a.kind === (b as typeof a).kind)

const passes = (e: SearchEntry, f: SearchFilter) => f.by === 'all' || (f.by === 'label' ? e.label === f.label : e.kind === f.kind)

/**
 * The entries of the tab that have every word of the query (accents and case ignored) in their name, type or description. Names that
 * start with the query first, then names that have it, then the rest; alphabetical inside each. No query: all of the tab, alphabetical
 */
export function matchEntries(entries: SearchEntry[], query: string, filter: SearchFilter): SearchEntry[] {
  const q = fold(query.trim())
  const words = q.split(/\s+/).filter(Boolean)
  const rank = (e: SearchEntry) => {
    const name = fold(e.name)
    return name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2
  }
  return entries
    .filter((e) => passes(e, filter))
    .filter((e) => {
      const all = fold(`${e.name} ${e.type} ${e.description}`)
      return words.every((w) => all.includes(w))
    })
    .map((e) => ({ e, rank: words.length ? rank(e) : 0 }))
    .sort((a, b) => a.rank - b.rank || a.e.name.localeCompare(b.e.name))
    .map(({ e }) => e)
}
