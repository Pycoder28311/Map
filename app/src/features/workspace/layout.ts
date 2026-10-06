// Workspace layout model: up to 4 panels on a 2×2 grid, as one of 8 templates.
// Pure functions (no React), so the rules are easy to test (layout.test.ts).
import type { PanelRef } from './types'

export type Slot = 'a' | 'b' | 'c' | 'd'
export type Edge = 'left' | 'right' | 'top' | 'bottom'
export type Template = '1' | '2-cols' | '2-rows' | '3-left' | '3-right' | '3-top' | '3-bottom' | '4'
/** panels[0] sits in slot a, panels[1] in slot b, … */
export type WorkspaceLayout = { template: Template; panels: PanelRef[] }

export const MAX_PANELS = 4
export const SLOTS: Slot[] = ['a', 'b', 'c', 'd']
export const WORKSPACE_PATH = '/workspace'

/** The slot covering each grid cell: [top-left, top-right, bottom-left, bottom-right] */
const TEMPLATE_CELLS: Record<Template, Slot[]> = {
  '1': ['a', 'a', 'a', 'a'],
  '2-cols': ['a', 'b', 'a', 'b'],
  '2-rows': ['a', 'a', 'b', 'b'],
  '3-left': ['a', 'b', 'a', 'c'], // big panel on the left
  '3-right': ['b', 'a', 'c', 'a'],
  '3-top': ['a', 'a', 'b', 'c'],
  '3-bottom': ['b', 'c', 'a', 'a'],
  '4': ['a', 'b', 'c', 'd'],
}
const TEMPLATES = Object.keys(TEMPLATE_CELLS) as Template[]
const DEFAULT_TEMPLATE: Record<number, Template> = { 1: '1', 2: '2-cols', 3: '3-left', 4: '4' }
/** Cells on each side of the grid */
const EDGE_CELLS: Record<Edge, number[]> = { left: [0, 2], right: [1, 3], top: [0, 1], bottom: [2, 3] }

/* ─────────────── Panels ─────────────── */

/** Stable text form of a panel: "dashboard", "project:p1" */
export const panelKey = (panel: PanelRef) => (panel.id ? `${panel.type}:${panel.id}` : panel.type)

export function parsePanelKey(key: string): PanelRef | null {
  const [type, ...rest] = key.split(':')
  if (!type) return null
  const id = rest.join(':')
  return id ? { type, id } : { type }
}

export const hasPanel = (layout: WorkspaceLayout, panel: PanelRef) =>
  layout.panels.some((p) => panelKey(p) === panelKey(panel))

export const panelAt = (layout: WorkspaceLayout, slot: Slot): PanelRef | undefined =>
  layout.panels[SLOTS.indexOf(slot)]

export const single = (panel: PanelRef): WorkspaceLayout => ({ template: '1', panels: [panel] })

/* ─────────────── Grid geometry ─────────────── */

/** CSS grid-template-areas, e.g. '"a b" "a c"' */
export function gridAreas(template: Template) {
  const c = TEMPLATE_CELLS[template]
  return `"${c[0]} ${c[1]}" "${c[2]} ${c[3]}"`
}

/** Where the resize lines run: the vertical one (x) per row, the horizontal one (y) per column */
export function splitLines(template: Template) {
  const c = TEMPLATE_CELLS[template]
  return {
    x: { top: c[0] !== c[1], bottom: c[2] !== c[3] },
    y: { left: c[0] !== c[2], right: c[1] !== c[3] },
  }
}

/** Edges of a slot where a new panel can be dropped: only spans of 2+ cells can split */
export function allowedEdges(layout: WorkspaceLayout, slot: Slot): Edge[] {
  if (layout.panels.length >= MAX_PANELS) return []
  const own = cellsOf(layout.template, slot)
  if (own.length === 4) return ['left', 'right', 'top', 'bottom']
  if (own.length === 2) return own[1] - own[0] === 2 ? ['top', 'bottom'] : ['left', 'right']
  return []
}

/* ─────────────── Changes ─────────────── */

/**
 * Adds a panel. With a target it splits that slot on that edge (a drop); without one it takes the
 * next free position (a button click). Returns the layout unchanged when it can't be added.
 */
export function addPanel(
  layout: WorkspaceLayout | null,
  panel: PanelRef,
  target?: { slot: Slot; edge: Edge },
): WorkspaceLayout {
  if (!layout) return single(panel)
  if (hasPanel(layout, panel) || layout.panels.length >= MAX_PANELS) return layout
  const place = target ?? autoTarget(layout)
  if (!place || !allowedEdges(layout, place.slot).includes(place.edge)) return layout

  const cells = toCells(layout)
  const key = panelKey(panel)
  for (const i of cellsOf(layout.template, place.slot)) {
    if (EDGE_CELLS[place.edge].includes(i)) cells[i] = key
  }
  return fromCells(cells, [...layout.panels, panel])
}

/** Removes a panel (Detach); the others re-tile. null when nothing is left */
export function removePanel(layout: WorkspaceLayout, slot: Slot): WorkspaceLayout | null {
  const removed = panelAt(layout, slot)
  if (!removed) return layout
  const removedKey = panelKey(removed)
  const rest = layout.panels.filter((p) => panelKey(p) !== removedKey)
  if (rest.length === 0) return null
  if (rest.length === 1) return single(rest[0])

  const cells = toCells(layout)
  const empty = cells.flatMap((k, i) => (k === removedKey ? [i] : []))
  const size = (key: string) => cells.filter((c) => c === key).length

  if (empty.length === 1) {
    // A single cell: the neighbour in the same column (else the same row) grows into it
    const e = empty[0]
    const from = [e ^ 2, e ^ 1].find((n) => cells[n] !== removedKey && size(cells[n]) === 1)
    if (from === undefined) return layout
    cells[e] = cells[from]
  } else {
    // A 2-cell panel: the two panels beside it grow across the gap
    const across = empty[1] - empty[0] === 2 ? 1 : 2
    for (const e of empty) cells[e] = cells[e ^ across]
  }
  return fromCells(cells, rest)
}

/** Keeps only one panel (Full page) */
export function keepOnly(layout: WorkspaceLayout, slot: Slot): WorkspaceLayout {
  const panel = panelAt(layout, slot)
  return panel ? single(panel) : layout
}

/* ─────────────── URL ─────────────── */

/** "/workspace?layout=3-left&panels=dashboard,project:p1,map:m1" */
export function workspaceHref(layout: WorkspaceLayout) {
  const keys = layout.panels.map((p) => panelKey(p).split(':').map(encodeURIComponent).join(':'))
  return `${WORKSPACE_PATH}?layout=${layout.template}&panels=${keys.join(',')}`
}

/**
 * Reads a layout from the URL. Unknown or repeated panels are dropped, at most 4 are kept, and a
 * template that doesn't fit the count is replaced by the default one. null when nothing is left.
 */
export function fromSearchParams(params: URLSearchParams, isKnown: (type: string) => boolean): WorkspaceLayout | null {
  const seen = new Set<string>()
  const panels: PanelRef[] = []
  for (const key of (params.get('panels') ?? '').split(',')) {
    const panel = parsePanelKey(key)
    if (!panel || !isKnown(panel.type) || seen.has(panelKey(panel))) continue
    seen.add(panelKey(panel))
    panels.push(panel)
  }
  if (panels.length === 0) return null
  const kept = panels.slice(0, MAX_PANELS)

  const requested = params.get('layout') as Template | null
  const fits = requested && TEMPLATES.includes(requested) && slotCount(requested) === kept.length
  return { template: fits ? requested : DEFAULT_TEMPLATE[kept.length], panels: kept }
}

/* ─────────────── Internals ─────────────── */

const cellsOf = (template: Template, slot: Slot) =>
  TEMPLATE_CELLS[template].flatMap((s, i) => (s === slot ? [i] : []))

const slotCount = (template: Template) => new Set(TEMPLATE_CELLS[template]).size

/** Where a clicked panel goes: the last panel that can still split, on its right (else bottom) side */
function autoTarget(layout: WorkspaceLayout): { slot: Slot; edge: Edge } | null {
  const preference: Edge[] = ['right', 'bottom', 'left', 'top']
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const edges = allowedEdges(layout, SLOTS[i])
    const edge = preference.find((e) => edges.includes(e))
    if (edge) return { slot: SLOTS[i], edge }
  }
  return null
}

/** The panel key in each cell */
const toCells = (layout: WorkspaceLayout) =>
  TEMPLATE_CELLS[layout.template].map((slot) => panelKey(layout.panels[SLOTS.indexOf(slot)]))

/** The template whose shape matches the cells, with the panels in its slot order */
function fromCells(cells: string[], panels: PanelRef[]): WorkspaceLayout {
  const byKey = new Map(panels.map((p) => [panelKey(p), p]))
  const template = TEMPLATES.find((t) => {
    const tc = TEMPLATE_CELLS[t]
    return tc.every((s, i) => tc.every((s2, j) => (s === s2) === (cells[i] === cells[j])))
  })
  if (!template) throw new Error(`No template for cells ${cells.join(',')}`)
  const tc = TEMPLATE_CELLS[template]
  const ordered = SLOTS.slice(0, slotCount(template)).map((slot) => byKey.get(cells[tc.indexOf(slot)])!)
  return { template, panels: ordered }
}
