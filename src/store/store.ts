// The app's one store: the drawing, its history (undo / redo), the tool and its settings, the selection and the view. A change of the
// drawing is a new Drawing object (items are never changed in place), except during a brush stroke, which paints on its own copy of the
// paint layer (made when the stroke starts) and notifies with `touch()`. A gesture (a stroke, a drag, a resize) is one undo step.
import { useSyncExternalStore } from 'react'
import type { Mirror } from '../model/mirror'
import { newDrawing, normalizeDrawing, normalizeShape } from '../model/normalize'
import type { BrushShape } from '../model/paint'
import { PAINT_ID, type Drawing, type Hex, type Item, type PaintItem, type ShapeItem, type TextAlign, type TextSize } from '../model/types'

export type Tool = 'select' | 'brush' | 'eraser' | 'fill' | 'eyedropper' | 'rect' | 'stepped' | 'ellipse' | 'line' | 'text'

export type Settings = {
  /** The main colour (brush, a shape's border, text) and the second one (a shape's fill, a text's outline) */
  main: Hex
  second: Hex
  brushSize: number
  brushShape: BrushShape
  /** New shapes */
  border: boolean
  borderThickness: number
  fill: boolean
  steps: number
  lineThickness: number
  /** New text */
  textSize: TextSize
  letterSpacing: number
  lineSpacing: number
  align: TextAlign
  outline: boolean
  shadow: boolean
  shadowColor: Hex
  shadowDx: number
  shadowDy: number
  mirror: Mirror
  grid: boolean
  /** Like holding Shift (for touch screens): squares, circles, straight lines, resizing that keeps proportions */
  constrain: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  main: '#140f0c',
  second: '#b8382b',
  brushSize: 1,
  brushShape: 'square',
  border: true,
  borderThickness: 1,
  fill: true,
  steps: 2,
  lineThickness: 1,
  textSize: 1,
  letterSpacing: 1,
  lineSpacing: 1,
  align: 'left',
  outline: false,
  shadow: false,
  shadowColor: '#000000',
  shadowDx: 1,
  shadowDy: 1,
  mirror: { x: false, y: false },
  grid: true,
  constrain: false,
}

/** On a narrow screen the panels are a sheet over the board: which part shows (null: closed) */
export type Sheet = 'selection' | 'tool' | 'colours' | null

/** Screen pixels per unit (a whole number: every unit the same size on screen) and where the board's top left is (CSS px) */
export type View = { zoom: number; panX: number; panY: number }

export type State = {
  drawing: Drawing
  past: Drawing[]
  future: Drawing[]
  tool: Tool
  settings: Settings
  selection: string | null
  view: View
  /** Bumped on every change, the stroke's in-place painting too */
  version: number
  /** A message under the board (a saved drawing that could not be read, too many colours …) */
  notice: string | null
  sheet: Sheet
  /** The library's asset being drawn (store/library.ts) */
  assetId: string | null
}

export const HISTORY_MAX = 200
export const ZOOMS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]

let state: State = {
  drawing: newDrawing(),
  past: [],
  future: [],
  tool: 'brush',
  settings: DEFAULT_SETTINGS,
  selection: null,
  view: { zoom: 8, panX: 0, panY: 0 },
  version: 0,
  notice: null,
  sheet: null,
  assetId: null,
}
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next, version: state.version + 1 }
  listeners.forEach((listener) => listener())
}

export const getState = () => state
export const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The whole state, or one part of it */
export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => pick(state))
}

/* ─────────────── History ─────────────── */

/** The drawing as it was when the gesture began (null: none going on) */
let gestureStart: Drawing | null = null

/** A gesture begins (a stroke, a drag, a resize): what it changes is one undo step */
export function begin() {
  if (gestureStart === null) gestureStart = state.drawing
}

/** The drawing while a gesture goes on (not a step of its own) */
export const live = (drawing: Drawing) => set({ drawing })

/** The gesture ends: one undo step if it changed anything */
export function end() {
  const start = gestureStart
  gestureStart = null
  if (start && start !== state.drawing) set({ past: [...state.past, start].slice(-HISTORY_MAX), future: [] })
}

/** The gesture is dropped: the drawing goes back to how it was when it began (a second finger landed: a pinch, not a stroke) */
export function cancel() {
  const start = gestureStart
  gestureStart = null
  if (start && start !== state.drawing) set({ drawing: start })
}

/** One change, one undo step */
export function commit(drawing: Drawing) {
  begin()
  live(drawing)
  end()
}

export function undo() {
  if (gestureStart || state.past.length === 0) return
  const drawing = state.past[state.past.length - 1]
  set({ drawing, past: state.past.slice(0, -1), future: [state.drawing, ...state.future], selection: keepSelection(drawing) })
}

export function redo() {
  if (gestureStart || state.future.length === 0) return
  const [drawing, ...future] = state.future
  set({ drawing, past: [...state.past, state.drawing], future, selection: keepSelection(drawing) })
}

const keepSelection = (d: Drawing) => (d.items.some((i) => i.id === state.selection) ? state.selection : null)

/** Another drawing (another asset, a new one, one opened from a file): the history starts again */
export function replaceDrawing(drawing: Drawing, assetId: string | null = state.assetId) {
  gestureStart = null
  set({ drawing: normalizeDrawing(drawing), past: [], future: [], selection: null, assetId })
}

/** Notifies after painting in place on a stroke's own copy of the paint layer */
export const touch = () => set({})

/* ─────────────── Items ─────────────── */

export const paintOf = (d: Drawing) => d.items.find((i): i is PaintItem => i.kind === 'paint')!

/** The drawing with this item changed (normalized: whole units, in the board) */
export function withShape(d: Drawing, item: ShapeItem): Drawing {
  const fixed = normalizeShape(item, d.width, d.height)
  return { ...d, items: d.items.map((i) => (i.id === item.id ? fixed : i)) }
}

/** The drawing with these shapes added on top */
export const withAdded = (d: Drawing, items: ShapeItem[]): Drawing => ({ ...d, items: [...d.items, ...items.map((i) => normalizeShape(i, d.width, d.height))] })

export const withoutItem = (d: Drawing, id: string): Drawing => (id === PAINT_ID ? d : { ...d, items: d.items.filter((i) => i.id !== id) })

/** One place up (+1) or down (−1) in the order (the paint layer too) */
export function withMoved(d: Drawing, id: string, by: 1 | -1): Drawing {
  const from = d.items.findIndex((i) => i.id === id)
  const to = from + by
  if (from < 0 || to < 0 || to >= d.items.length) return d
  const items: Item[] = [...d.items]
  ;[items[from], items[to]] = [items[to], items[from]]
  return { ...d, items }
}

export const selected = (s: State): Item | null => s.drawing.items.find((i) => i.id === s.selection) ?? null

/* ─────────────── Tool, settings, view ─────────────── */

export const setTool = (tool: Tool) => set({ tool, ...(tool !== 'select' && tool !== 'text' ? { selection: null } : {}) })
export const setSettings = (patch: Partial<Settings>) => set({ settings: { ...state.settings, ...patch } })
export const select = (id: string | null) => set({ selection: id })
export const setView = (view: Partial<View>) => set({ view: { ...state.view, ...view } })
export const setNotice = (notice: string | null) => set({ notice })
export const setSheet = (sheet: Sheet) => set({ sheet })

/** Changes the drawing's own settings (name, scale, background): one undo step */
export const setDrawingProps = (patch: Partial<Pick<Drawing, 'name' | 'exportScale' | 'background'>>) => commit(normalizeDrawing({ ...state.drawing, ...patch }))

/** The paint layer, ready to paint on in place: a copy put into the drawing (call inside a gesture) */
export function paintCopy(): PaintItem {
  const d = state.drawing
  const copy: PaintItem = { ...paintOf(d), cells: [...paintOf(d).cells] }
  live({ ...d, items: d.items.map((i) => (i.kind === 'paint' ? copy : i)) })
  return copy
}

/** Starts the store from what the browser kept (store/library.ts) */
export function hydrate(next: Partial<Pick<State, 'drawing' | 'settings' | 'view' | 'assetId'>>, notice: string | null) {
  state = { ...state, ...next, settings: { ...DEFAULT_SETTINGS, ...next.settings }, notice, version: state.version + 1 }
  listeners.forEach((listener) => listener())
}
