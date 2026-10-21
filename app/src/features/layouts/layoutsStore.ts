// The saved pane layouts. The layouts themselves are live data: the `layouts` table through its resource (a list in the shared store,
// writes shown at once, like every resource: lib/resource/hooks.ts). What only this tab knows lives here: the layout last opened from
// its tile, and the unsaved changes kept for a layout after its panes were left.
import { PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useMemo, useSyncExternalStore } from 'react'
import { actionsOf, useResourceList } from '../../lib/resource/hooks'
import { resourceByName } from '../../resources/registry'
import { fromSearchParams, panelKey, parsePanelKey, splitFor, type Template, type WorkspaceLayout } from '../workspace/layout'
import type { Split } from '../workspace/split'
import type { PanelRef } from '../workspace/types'

export const layoutsResource = resourceByName('layouts')!

/** The least needed to recreate a pane layout: its shape, its panels (panelKey) and the line positions */
export type SavedLayout = {
  /** The row's id, as text (tile keys, drag data, Recent) */
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

/* ─────────────── The table's row ─────────────── */

type Row = Record<string, unknown> & { id: number | string }
const PANE_FIELDS = ['panelA', 'panelB', 'panelC', 'panelD'] as const
/** The lines are stored in thousandths (integers); 0 for a 2×2 half that is joined with its partner */
const thousandths = (value: number | undefined) => (value === undefined ? 0 : Math.round(value * 1000))

/** A layout from its row (the API's) */
export function fromRow(row: Row): SavedLayout {
  const line = (name: string) => (typeof row[name] === 'number' ? (row[name] as number) / 1000 : 0)
  const x2 = line('splitX2')
  const y2 = line('splitY2')
  return {
    id: String(row.id),
    template: row.template as Template,
    panels: PANE_FIELDS.map((name) => String(row[name] ?? '')).filter((key) => key !== ''),
    split: { x: line('splitX'), y: line('splitY'), ...(x2 ? { x2 } : {}), ...(y2 ? { y2 } : {}) },
    archived: row.archived === true,
  }
}

/** The row's fields of a layout's shape, panes and lines (what create and update send) */
export function toFields({ template, panels, split }: Pick<SavedLayout, 'template' | 'panels' | 'split'>) {
  return {
    template,
    splitX: thousandths(split.x),
    splitY: thousandths(split.y),
    splitX2: thousandths(split.x2),
    splitY2: thousandths(split.y2),
    panelA: panels[0] ?? '',
    panelB: panels[1] ?? '',
    panelC: panels[2] ?? '',
    panelD: panels[3] ?? '',
  }
}

/* ─────────────── State of this tab ─────────────── */

type Ui = {
  selectedId: string | null
  /** By layout id: its tile stays blue (Save / ✕) until they're saved or dropped */
  pending: Record<string, PendingChanges>
}

let ui: Ui = { selectedId: null, pending: {} }
const listeners = new Set<() => void>()

function set(next: Partial<Ui>) {
  ui = { ...ui, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getLayoutsUi = () => ui

/** The saved layouts that are not in the Trash (newest first: the server's order), the layout last opened from its tile and the kept changes */
export function useLayoutsState() {
  const list = useResourceList(layoutsResource, { limit: PAGE_SIZE_MAX })
  const { selectedId, pending } = useSyncExternalStore(subscribe, getLayoutsUi)
  const layouts = useMemo(() => (list.items as Row[]).map(fromRow), [list.items])
  return { layouts, status: list.status, refresh: list.refresh, selectedId, pending }
}

/** Only the layout last opened from its tile (it reads no list) */
export const useSelectedLayoutId = () => useSyncExternalStore(subscribe, () => ui.selectedId)

const without = (id: string) => {
  const { [id]: _, ...rest } = ui.pending
  return rest
}

/** Keeps a layout's unsaved changes after its panes are left (replacing older ones) */
export function keepChanges(id: string, layout: WorkspaceLayout, split: Split) {
  set({ pending: { ...ui.pending, [id]: { layout, split } } })
}

/** Forgets a layout's unsaved changes */
export function dropChanges(id: string) {
  if (id in ui.pending) set({ pending: without(id) })
}

/** The layout last opened from its tile (Save then asks to update it); null: none */
export function selectLayout(id: string | null) {
  if (ui.selectedId !== id) set({ selectedId: id })
}

/* ─────────────── Changes (each is one request, through the resource's actions) ─────────────── */

/** Saves a new layout (it is first in the list) and selects it; resolves with its id. Fails with the server's error */
export async function saveLayout(layout: WorkspaceLayout, split: Split): Promise<string> {
  const made = await actionsOf(layoutsResource).create(toFields(toSaved(layout, split)))
  const id = String(made.id)
  selectLayout(id)
  return id
}

/**
 * Saves a layout's panes over it (its kept changes, if any, are then saved too). The tile shows the change at once; if the server
 * refuses, it goes back and the kept changes are kept again. Fails with the server's error
 */
export async function updateLayout(id: string, layout: WorkspaceLayout, split: Split) {
  const held = ui.pending[id]
  dropChanges(id)
  try {
    await actionsOf(layoutsResource).update(Number(id), toFields(toSaved(layout, split)) as never)
  } catch (error) {
    if (held) keepChanges(id, held.layout, held.split)
    throw error
  }
}

/** Puts a layout in the Trash (shown at once) */
export function archiveLayout(id: string) {
  if (ui.selectedId === id) selectLayout(null)
  return actionsOf(layoutsResource)
    .trash(Number(id))
    .catch((error) => console.error('Could not move the layout to the Trash', error))
}

/** Takes a layout out of the Trash */
export const restoreLayout = (id: string) => actionsOf(layoutsResource).restore(Number(id))

/** Deletes a layout for good. Fails with the server's error */
export async function deleteLayout(id: string) {
  await actionsOf(layoutsResource).remove(Number(id))
  if (ui.selectedId === id) selectLayout(null)
  dropChanges(id)
}

/** Tests only: nothing selected, no kept changes */
export function resetLayoutsUi() {
  set({ selectedId: null, pending: {} })
}
