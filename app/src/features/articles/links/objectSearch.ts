// What the Article link's picker lists: the objects of one kind (or all of them), read one page at a time, never all at once.
// A search filters the pages read so far and asks for the next ones while there are few matches. The server has no search yet: when
// it has, `ObjectPages.loadMore` asks it with the query and the filtering here goes. Pure but for the API calls (objectSearch.test.ts).
import type { Page } from '@map/shared'
import { fold } from '../../search/search'
import type { ObjectType } from './linkHref'

/** The kinds the picker offers, and the resource of each */
export const PICKER_KINDS: { type: ObjectType; resource: string }[] = [
  { type: 'article', resource: 'articles' },
  { type: 'map', resource: 'maps' },
  { type: 'object', resource: 'objectCards' },
  { type: 'folder', resource: 'folders' },
  { type: 'project', resource: 'projects' },
]

type Item = Record<string, unknown> & { id: number | string }

/** One kind as the picker reads it: its list call and how an item is named */
export type ObjectSource = {
  type: ObjectType
  list: (page: { limit: number; cursor: string | null }) => Promise<Page<Item>>
  title: (item: Item) => string
  subtitle?: (item: Item) => string | undefined
}

export type ObjectHit = { type: ObjectType; id: string; title: string; subtitle?: string }

type KindState = { hits: ObjectHit[]; cursor: string | null; done: boolean; loading: boolean; error: string | null }

/** Items asked for in one page */
export const PAGE = 30
/** A search asks for more pages while it has fewer matches than this */
export const ENOUGH = 15
/** Pages one search reads by itself before it waits for "Keep searching" */
export const PAGES_PER_SEARCH = 5

/** Whether a hit has every word of the query in its title or subtitle */
export const matches = (hit: ObjectHit, words: string[]) => {
  const text = fold(`${hit.title} ${hit.subtitle ?? ''}`)
  return words.every((w) => text.includes(w))
}

/** The pages of the kinds read so far, and the next one of each */
export class ObjectPages {
  private states = new Map<ObjectType, KindState>()
  private sources: ObjectSource[]
  private listeners = new Set<() => void>()
  /** When it was made (the pickers start again on fresh pages after a while: useObjectSearch.ts) */
  readonly made = Date.now()

  constructor(sources: ObjectSource[]) {
    this.sources = sources
    for (const s of sources) this.states.set(s.type, { hits: [], cursor: null, done: false, loading: false, error: null })
  }

  /** Called after every change (a page read, or failed) */
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private onChange() {
    this.listeners.forEach((listener) => listener())
  }

  private state(type: ObjectType) {
    return this.states.get(type)!
  }

  /** Reads the next page of a kind (nothing when it is being read or there is no more) */
  async loadMore(type: ObjectType): Promise<void> {
    const source = this.sources.find((s) => s.type === type)
    const state = this.state(type)
    if (!source || state.loading || state.done) return
    this.states.set(type, { ...state, loading: true, error: null })
    this.onChange()
    try {
      const page = await source.list({ limit: PAGE, cursor: state.cursor })
      const hits = page.items.map((item) => ({ type, id: String(item.id), title: source.title(item), subtitle: source.subtitle?.(item) || undefined }))
      const now = this.state(type)
      this.states.set(type, { hits: [...now.hits, ...hits], cursor: page.nextCursor, done: page.nextCursor === null, loading: false, error: null })
    } catch (error) {
      this.states.set(type, { ...this.state(type), loading: false, error: error instanceof Error ? error.message : 'Could not load' })
    }
    this.onChange()
  }

  /** The kinds (of these) that have more pages, none being read now */
  more(types: ObjectType[]) {
    return types.filter((t) => this.states.has(t) && !this.state(t).done && !this.state(t).error)
  }

  loading(types: ObjectType[]) {
    return types.some((t) => this.state(t)?.loading)
  }

  error(types: ObjectType[]) {
    return types.map((t) => this.state(t)?.error).find(Boolean) ?? null
  }

  /** Whether a kind has had its first page read */
  started(type: ObjectType) {
    const s = this.state(type)
    return s.hits.length > 0 || s.done || s.cursor !== null
  }

  /** The hits of these kinds that match the query, by title (all when it is empty); `exclude`: a `type:id` left out (the article itself) */
  results(types: ObjectType[], query: string, exclude?: string): ObjectHit[] {
    const words = fold(query).split(/\s+/).filter(Boolean)
    const hits = types.flatMap((t) => this.state(t)?.hits ?? []).filter((h) => `${h.type}:${h.id}` !== exclude && matches(h, words))
    return types.length > 1 ? hits.sort((a, b) => a.title.localeCompare(b.title)) : hits
  }
}

/**
 * Which kind to read next for a search: one that has more, while the matches are fewer than ENOUGH and the search has not read its
 * PAGES_PER_SEARCH pages yet. The kind with the fewest pages read first, so All fills from every kind. Null: wait (for scrolling, or
 * "Keep searching")
 */
export function nextToLoad(pages: ObjectPages, types: ObjectType[], matchCount: number, pagesThisSearch: number): ObjectType | null {
  if (pages.loading(types)) return null
  const more = pages.more(types)
  const unstarted = more.find((t) => !pages.started(t))
  if (unstarted) return unstarted
  if (matchCount >= ENOUGH || pagesThisSearch >= PAGES_PER_SEARCH) return null
  return more[0] ?? null
}
