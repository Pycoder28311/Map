// Who can see an article, until the server keeps it (docs/plans/31): on this device, one entry per article. `ArticlePrivacy` is the
// shape the article's future field will have, so the page doesn't change when it moves to the server; only this file does.
import { useSyncExternalStore } from 'react'

export type Visibility = 'private' | 'public'
/** What an allowed person can do: only read the article, or edit it */
export type AllowedRole = 'reader' | 'editor'
export type Allowed = { id: string; role: AllowedRole }
export type ArticlePrivacy = {
  visibility: Visibility
  /** People who may see it while it is private, each with what they can do */
  allowed: Allowed[]
}

/** What was kept as the allowed people: the old list of ids (all readers) or the list of people with their role; anything else is dropped */
export function normalizeAllowed(raw: unknown): Allowed[] {
  if (!Array.isArray(raw)) return []
  const out: Allowed[] = []
  for (const x of raw) {
    const entry: Allowed | null =
      typeof x === 'string' ? { id: x, role: 'reader' } : x && typeof x === 'object' && typeof (x as Allowed).id === 'string' ? { id: (x as Allowed).id, role: (x as Allowed).role === 'editor' ? 'editor' : 'reader' } : null
    if (entry && !out.some((o) => o.id === entry.id)) out.push(entry)
  }
  return out
}

/** The list with this person given a role (added if they were not there), or taken out (`role` null) */
export function withRole(allowed: Allowed[], id: string, role: AllowedRole | null): Allowed[] {
  const rest = allowed.filter((a) => a.id !== id)
  if (!role) return rest
  return allowed.some((a) => a.id === id) ? allowed.map((a) => (a.id === id ? { id, role } : a)) : [...rest, { id, role }]
}

export const DEFAULT_PRIVACY: ArticlePrivacy = { visibility: 'private', allowed: [] }

const keyOf = (articleId: string) => `map:privacy:${articleId}`
const listeners = new Set<() => void>()
// The last value read for each article, so a snapshot is the same object until it changes
const cache = new Map<string, ArticlePrivacy>()

/** Reads what this device holds; anything broken is the default */
export function readPrivacy(articleId: string): ArticlePrivacy {
  const known = cache.get(articleId)
  if (known) return known
  let privacy = DEFAULT_PRIVACY
  try {
    const parsed = JSON.parse(localStorage.getItem(keyOf(articleId)) ?? 'null') as Partial<ArticlePrivacy> | null
    if (parsed && (parsed.visibility === 'private' || parsed.visibility === 'public')) {
      privacy = { visibility: parsed.visibility, allowed: normalizeAllowed(parsed.allowed) }
    }
  } catch {
    // Not readable: the default
  }
  cache.set(articleId, privacy)
  return privacy
}

export function writePrivacy(articleId: string, privacy: ArticlePrivacy) {
  cache.set(articleId, privacy)
  try {
    localStorage.setItem(keyOf(articleId), JSON.stringify(privacy))
  } catch {
    // Not kept: it is back to what it was on reload
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The article's privacy, and the way to change it (saved at once) */
export function useArticlePrivacy(articleId: string): [ArticlePrivacy, (next: ArticlePrivacy) => void] {
  const privacy = useSyncExternalStore(subscribe, () => readPrivacy(articleId))
  return [privacy, (next) => writePrivacy(articleId, next)]
}
