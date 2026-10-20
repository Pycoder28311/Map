// The navbar search: which objects match a query and the filters. Pure (search.test.ts).
import type { MockObject, ObjectKind } from '../../mocks/projects'
import { htmlToPlain } from '../notes/noteHtml'

export const KINDS: ObjectKind[] = ['project', 'folder', 'object', 'map', 'note', 'article']

export type SearchFilters = {
  /** include: only the ticked kinds (none ticked: all); exclude: all but the ticked kinds */
  typeMode: 'include' | 'exclude'
  types: ObjectKind[]
  /** Only objects in these projects (none ticked: any, top-level ones too) */
  projects: string[]
}

export const NO_FILTERS: SearchFilters = { typeMode: 'include', types: [], projects: [] }

/** Lower case, without accents: "Café" → "cafe" */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Whether any filter narrows the results */
export const hasFilters = (f: SearchFilters) => f.types.length > 0 || f.projects.length > 0

/**
 * The objects matching every word of the query (in the name or the text, ignoring case and accents)
 * and the filters, best first: name starts with the query, then name contains every word, then only
 * the text does. An empty query with filters lists everything they let through, by name.
 * `objects`: the visible ones only.
 */
export function searchObjects(objects: MockObject[], query: string, filters: SearchFilters): MockObject[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0 && !hasFilters(filters)) return []
  const q = words.join(' ')

  const kindOk = (o: MockObject) =>
    filters.types.length === 0 || (filters.typeMode === 'include' ? filters.types.includes(o.kind) : !filters.types.includes(o.kind))
  const projectOk = (o: MockObject) => filters.projects.length === 0 || (o.parentId !== null && filters.projects.includes(o.parentId))

  const scored: { o: MockObject; score: number }[] = []
  for (const o of objects) {
    if (!kindOk(o) || !projectOk(o)) continue
    const name = fold(o.name)
    const all = `${name} ${fold(htmlToPlain(o.text))} ${fold(o.description ?? '')}`
    if (!words.every((w) => all.includes(w))) continue
    const score = q && name.startsWith(q) ? 0 : words.every((w) => name.includes(w)) ? 1 : 2
    scored.push({ o, score })
  }
  return scored.sort((a, b) => a.score - b.score || a.o.name.localeCompare(b.o.name)).map((s) => s.o)
}
