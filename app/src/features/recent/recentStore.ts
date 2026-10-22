// What the user opened lately (the Dashboard's Recent column), newest first. Kept in this browser,
// per user (localStorage); the helpers that build and add entries are pure (recentStore.test.ts).
import { useSyncExternalStore } from 'react'
import { isNewId } from '../../lib/resource/newItem'
import { panelKey, workspaceHref, type Template, type WorkspaceLayout } from '../workspace/layout'

export const MAX_RECENT = 20

/**
 * One thing opened:
 * - panels: one panel (an object, or a page like Notes) or several (a combination of panes)
 * - layout: a saved layout (opened from its tile)
 */
export type RecentEntry =
  | { key: string; kind: 'panels'; template: Template; panels: string[]; at: number }
  | { key: string; kind: 'layout'; layoutId: string; at: number }

/** The entry for what's on screen; null for the Dashboard itself (it's where Recent is shown) */
export function entryForLayout(layout: WorkspaceLayout, at: number): RecentEntry | null {
  const panels = layout.panels.map(panelKey)
  if (panels.length === 1 && panels[0] === 'dashboard') return null
  // An item that is not made yet (a "new …" page) is not something that was opened
  if (layout.panels.some((panel) => isNewId(panel.id))) return null
  const key = panels.length === 1 ? panels[0] : workspaceHref(layout)
  return { key, kind: 'panels', template: layout.template, panels, at }
}

export const entryForSavedLayout = (layoutId: string, at: number): RecentEntry => ({ key: `layout:${layoutId}`, kind: 'layout', layoutId, at })

/** Adds an entry first; an older one with the same key goes away; at most MAX_RECENT */
export function addRecent(list: RecentEntry[], entry: RecentEntry): RecentEntry[] {
  return [entry, ...list.filter((e) => e.key !== entry.key)].slice(0, MAX_RECENT)
}

/** The list without the entry of this key */
export const withoutRecent = (list: RecentEntry[], key: string): RecentEntry[] => list.filter((e) => e.key !== key)

/* ─────────────── Store (per user, in localStorage) ─────────────── */

const storageKey = (userId: string) => `map:recent:${userId}`
const lists = new Map<string, RecentEntry[]>()
const listeners = new Set<() => void>()
const EMPTY: RecentEntry[] = []

function load(userId: string): RecentEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]')
    return Array.isArray(parsed) ? (parsed as RecentEntry[]) : []
  } catch {
    return []
  }
}

export function getRecent(userId: string | undefined): RecentEntry[] {
  if (!userId) return EMPTY
  if (!lists.has(userId)) lists.set(userId, load(userId))
  return lists.get(userId)!
}

function save(userId: string, next: RecentEntry[]) {
  lists.set(userId, next)
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(next))
  } catch {
    // Storage full or blocked: kept for this session only
  }
  listeners.forEach((listener) => listener())
}

export function recordRecent(userId: string, entry: RecentEntry) {
  save(userId, addRecent(getRecent(userId), entry))
}

/** Forgets an entry (e.g. a note that is gone or in the Trash) */
export function removeRecent(userId: string, key: string) {
  const current = getRecent(userId)
  const next = withoutRecent(current, key)
  if (next.length !== current.length) save(userId, next)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The user's recent entries; re-renders when one is added */
export const useRecent = (userId: string | undefined) => useSyncExternalStore(subscribe, () => getRecent(userId))
