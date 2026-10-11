// MOCK DATA: saved pane layouts, in memory. Nothing is saved: a reload starts with none. Replaced by
// API calls later (same function names, async then); the UI only uses what's exported here.
import { useSyncExternalStore } from 'react'
import { fromSearchParams, panelKey, parsePanelKey, splitFor, type Template, type WorkspaceLayout } from '../features/workspace/layout'
import type { Split } from '../features/workspace/split'
import type { PanelRef } from '../features/workspace/types'

/** The least needed to recreate a pane layout: its shape, its panels (panelKey) and the line positions */
export type SavedLayout = {
  id: string
  template: Template
  /** In slot order (a, b, c, d), e.g. ["map:m1", "note:n2"] */
  panels: string[]
  split: Split
  /** In the trash */
  archived: boolean
}

/** Changes made to a layout's panes, not saved yet, kept after its panes were left */
export type PendingChanges = { layout: WorkspaceLayout; split: Split }

type State = {
  layouts: SavedLayout[]
  selectedId: string | null
  /** By layout id: its tile stays blue (Save / ✕) until they're saved or dropped */
  pending: Record<string, PendingChanges>
}

let state: State = { layouts: [], selectedId: null, pending: {} }
const listeners = new Set<() => void>()
let nextId = 1

function set(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getLayoutsState = () => state

/** All saved layouts (archived ones included) and the selected one; re-renders on every change */
export const useLayoutsState = () => useSyncExternalStore(subscribe, getLayoutsState)

/* ─────────────── Converting ─────────────── */

/** What's saved: the shape, the panels and the lines (a 2×2 layout's uneven halves only when they differ) */
export const toSaved = (layout: WorkspaceLayout, split: Split) => ({
  template: layout.template,
  panels: layout.panels.map(panelKey),
  split: splitFor(layout.template, split),
})

/**
 * The layout to show for a saved one: panels that no longer exist (or whose type is unknown) are left
 * out, and the template is fixed for the count, like a hand-edited URL (fromSearchParams). null when
 * nothing is left.
 */
export function fromSaved(saved: Pick<SavedLayout, 'template' | 'panels'>, isKnown: (type: string) => boolean, exists: (panel: PanelRef) => boolean) {
  const keys = saved.panels.filter((key) => {
    const panel = parsePanelKey(key)
    return panel !== null && exists(panel)
  })
  return fromSearchParams(new URLSearchParams({ layout: saved.template, panels: keys.join(',') }), isKnown)
}

/** The same shape, panels and sizes (sizes within a hair; a missing half equals its partner) */
export function sameLayout(saved: Pick<SavedLayout, 'template' | 'panels' | 'split'>, layout: WorkspaceLayout, split: Split) {
  const now = toSaved(layout, split)
  const near = (a: number, b: number) => Math.abs(a - b) < 0.001
  const a = splitFor(saved.template, saved.split)
  const b = now.split
  return (
    saved.template === now.template &&
    saved.panels.join(',') === now.panels.join(',') &&
    near(a.x, b.x) &&
    near(a.y, b.y) &&
    near(a.x2 ?? a.x, b.x2 ?? b.x) &&
    near(a.y2 ?? a.y, b.y2 ?? b.y)
  )
}

/* ─────────────── Changes ─────────────── */

/** Saves a new layout (last) and selects it; returns its id */
export function saveLayout(layout: WorkspaceLayout, split: Split) {
  const id = `l${nextId++}`
  set({ layouts: [...state.layouts, { id, archived: false, ...toSaved(layout, split) }], selectedId: id })
  return id
}

/** Saves a layout's panes over it (its pending changes, if any, are then saved too) */
export function updateLayout(id: string, layout: WorkspaceLayout, split: Split) {
  if (!state.layouts.some((l) => l.id === id)) return
  set({ layouts: state.layouts.map((l) => (l.id === id ? { ...l, ...toSaved(layout, split) } : l)), pending: without(id) })
}

const without = (id: string) => {
  const { [id]: _, ...rest } = state.pending
  return rest
}

/** Keeps a layout's unsaved changes after its panes are left (replacing older ones) */
export function keepChanges(id: string, layout: WorkspaceLayout, split: Split) {
  if (state.layouts.some((l) => l.id === id)) set({ pending: { ...state.pending, [id]: { layout, split } } })
}

/** Forgets a layout's unsaved changes */
export function dropChanges(id: string) {
  if (id in state.pending) set({ pending: without(id) })
}

/** The layout last opened from its tile (Save then asks to update it); null: none */
export function selectLayout(id: string | null) {
  if (state.selectedId !== id) set({ selectedId: id })
}

const setArchived = (id: string, archived: boolean) => {
  if (!state.layouts.some((l) => l.id === id && l.archived !== archived)) return
  set({
    layouts: state.layouts.map((l) => (l.id === id ? { ...l, archived } : l)),
    selectedId: archived && state.selectedId === id ? null : state.selectedId,
  })
}

export const archiveLayout = (id: string) => setArchived(id, true)
export const restoreLayout = (id: string) => setArchived(id, false)

export function deleteLayout(id: string) {
  if (!state.layouts.some((l) => l.id === id)) return
  set({
    layouts: state.layouts.filter((l) => l.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
    pending: without(id),
  })
}

/** Deletes every archived layout (emptying the trash) */
export function deleteArchivedLayouts() {
  if (!state.layouts.some((l) => l.archived)) return
  const pending = Object.fromEntries(Object.entries(state.pending).filter(([id]) => !state.layouts.find((l) => l.id === id)?.archived))
  set({ layouts: state.layouts.filter((l) => !l.archived), pending })
}

/** Tests only: no layouts */
export function resetMockLayouts() {
  nextId = 1
  set({ layouts: [], selectedId: null, pending: {} })
}
