// The navbar search: which items match a query and the filters. Pure (search.test.ts). It looks in the items of the resources that
// turned search on (their title and their preview or description).

export type SearchFilters = {
  /** include: only the ticked kinds (none ticked: all); exclude: all but the ticked kinds. A kind is a resource's panel type */
  typeMode: 'include' | 'exclude'
  types: string[]
}

export const NO_FILTERS: SearchFilters = { typeMode: 'include', types: [] }

/** An item of a resource, as the search sees it: `text` is what it can be found by besides its name (a note's preview) */
export type SearchItem = { id: string; kind: string; name: string; text: string }

/** One result: opens the panel `{ type: kind, id }` */
export type SearchResult = { id: string; kind: string; name: string; description?: string }

/** Lower case, without accents: "Café" → "cafe" */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Whether any filter narrows the results */
export const hasFilters = (f: SearchFilters) => f.types.length > 0

type Candidate = SearchResult & { text: string }

/**
 * The items matching every word of the query (in the name or the text, ignoring case and accents) and the filters, best first:
 * name starts with the query, then name contains every word, then only the text does (ties: by name). An empty query with filters
 * lists everything they let through, by name. `items`: the resources' (never archived ones).
 */
export function searchAll(items: SearchItem[], query: string, filters: SearchFilters): SearchResult[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0 && !hasFilters(filters)) return []
  const q = words.join(' ')

  // The description: the first line of the text
  const candidates: Candidate[] = items.map((item) => ({ id: item.id, kind: item.kind, name: item.name, text: item.text, description: item.text.split('\n')[0] || undefined }))

  const kindOk = (c: Candidate) =>
    filters.types.length === 0 || (filters.typeMode === 'include' ? filters.types.includes(c.kind) : !filters.types.includes(c.kind))

  const scored: { c: Candidate; score: number }[] = []
  for (const c of candidates) {
    if (!kindOk(c)) continue
    const name = fold(c.name)
    const all = `${name} ${fold(c.text)}`
    if (!words.every((w) => all.includes(w))) continue
    const score = q && name.startsWith(q) ? 0 : words.every((w) => name.includes(w)) ? 1 : 2
    scored.push({ c, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
    .map(({ c }) => ({ id: c.id, kind: c.kind, name: c.name, description: c.description }))
}

