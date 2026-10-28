// Who can see an article, until the server keeps it (docs/plans/31): on this device, one entry per article. `ArticlePrivacy` is the
// shape the article's future field will have, so the page doesn't change when it moves to the server; only this file does.
import { useSyncExternalStore } from 'react'

export type Visibility = 'private' | 'public'
export type ArticlePrivacy = {
  visibility: Visibility
  /** People (ids) who may see it while it is private */
  allowed: string[]
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
      privacy = { visibility: parsed.visibility, allowed: Array.isArray(parsed.allowed) ? parsed.allowed.filter((id) => typeof id === 'string') : [] }
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
