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

/** What a person is given while the list is being edited, before Apply: chosen or not, and the two switches */
export type Permission = { on: boolean; read: boolean; edit: boolean }

/** A person's permission as the saved list has it */
export function permissionOf(allowed: Allowed[], id: string): Permission {
  const a = allowed.find((x) => x.id === id)
  return a ? { on: true, read: true, edit: a.role === 'editor' } : { on: false, read: false, edit: false }
}

/** The switches' rules: editing needs reading (editing on turns reading on, reading off turns editing off), choosing a person starts with reading */
export function withSwitch(p: Permission, change: Partial<Permission>): Permission {
  const next = { ...p, ...change }
  if (change.on === true && !p.on && !next.read && !next.edit) next.read = true
  if (change.on === false) return { on: false, read: false, edit: false }
  if (change.edit === true) next.read = true
  if (change.read === false) next.edit = false
  return next
}

/** The saved list after the edits: a chosen person with a switch on is a reader (reading) or an editor (editing); the others are out */
export function allowedFrom(allowed: Allowed[], edits: Record<string, Permission>): Allowed[] {
  const ids = [...new Set([...allowed.map((a) => a.id), ...Object.keys(edits)])]
  const out: Allowed[] = []
  for (const id of ids) {
    const p = edits[id] ?? permissionOf(allowed, id)
    if (p.on && (p.read || p.edit)) out.push({ id, role: p.edit ? 'editor' : 'reader' })
  }
  return out
}

/** What changes if the edits are applied: who gets access, whose access changes, who loses it */
export function changesOf(allowed: Allowed[], next: Allowed[]) {
  const was = (id: string) => allowed.find((a) => a.id === id)
  return {
    added: next.filter((n) => !was(n.id)),
    changed: next.filter((n) => was(n.id) && was(n.id)!.role !== n.role),
    removed: allowed.filter((a) => !next.some((n) => n.id === a.id)),
  }
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
