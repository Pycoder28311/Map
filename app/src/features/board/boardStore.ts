// MOCK DATA: each map's board (what is drawn on it), in memory. Nothing is saved: a reload starts empty.
// Replaced by API calls later (same function names, async then); the UI only uses what's exported here.
// Every change makes new objects and arrays, so an earlier board stays as it was (undo can keep it).
import { useSyncExternalStore } from 'react'
import { applyChange, type Change, type Draft, type Patch } from './changes'
import { emptyBoard, LAYER_BACKGROUND, LAYER_MAIN, type Board, type BoardObject, type Layer } from './types'

export type { Change, Draft, Patch }

const EMPTY: Board = Object.freeze(emptyBoard()) as Board

let boards = new Map<string, Board>()
const listeners = new Set<() => void>()

/** The boards before and after the current one, per map (boards never change, so a step is a reference) */
type History = { past: Board[]; future: Board[] }
const NO_HISTORY: History = { past: [], future: [] }
/** How many steps back one map remembers */
export const HISTORY_LIMIT = 100
let histories = new Map<string, History>()

const historyOf = (mapId: string) => histories.get(mapId) ?? NO_HISTORY

function replace(mapId: string, board: Board, history: History) {
  boards = new Map(boards).set(mapId, board)
  histories = new Map(histories).set(mapId, history)
  listeners.forEach((listener) => listener())
}

// Every change is one step back, and ends the steps forward
function set(mapId: string, board: Board) {
  const { past } = historyOf(mapId)
  replace(mapId, board, { past: [...past, getBoard(mapId)].slice(-HISTORY_LIMIT), future: [] })
}

/** Calls `listener` after every change; returns how to stop */
export function subscribeBoards(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The map's board; the same empty board every time for a map nothing was drawn on */
export const getBoard = (mapId: string): Board => boards.get(mapId) ?? EMPTY

export const useBoard = (mapId: string) => useSyncExternalStore(subscribeBoards, () => getBoard(mapId))

// Only the board's images belong on the background layer, and they don't exist yet
function checkLayer(layer: Layer) {
  if (layer === LAYER_BACKGROUND) throw new Error('Only images go on the background layer')
}

/** Adds an object (on top, or at position `at`) and returns its id */
export function addObject(mapId: string, draft: Draft, at?: number): number {
  const board = getBoard(mapId)
  const layer = draft.layer ?? LAYER_MAIN
  checkLayer(layer)
  const object = { ...draft, layer, id: board.nextId } as BoardObject
  const objects = [...board.objects]
  objects.splice(at === undefined ? objects.length : Math.max(0, Math.min(at, objects.length)), 0, object)
  set(mapId, { nextId: board.nextId + 1, objects })
  return object.id
}

/** Changes some of an object's fields (nothing happens for an unknown id) */
export function updateObject(mapId: string, id: number, patch: Patch) {
  const board = getBoard(mapId)
  if (patch.layer !== undefined) checkLayer(patch.layer)
  if (!board.objects.some((o) => o.id === id)) return
  const objects = board.objects.map((o) => (o.id === id ? ({ ...o, ...patch, id: o.id, kind: o.kind } as BoardObject) : o))
  set(mapId, { ...board, objects })
}

/** Removes an object, and the links other objects had to it */
export function removeObject(mapId: string, id: number) {
  const board = getBoard(mapId)
  if (!board.objects.some((o) => o.id === id)) return
  const objects = board.objects
    .filter((o) => o.id !== id)
    .map((o) => (o.links.some((l) => l.to === 'board' && l.id === id) ? { ...o, links: o.links.filter((l) => !(l.to === 'board' && l.id === id)) } : o))
  set(mapId, { ...board, objects })
}

/** Moves an object to position `toIndex` of the list (its place in the stacking order) */
export function moveObject(mapId: string, id: number, toIndex: number) {
  const board = getBoard(mapId)
  const from = board.objects.findIndex((o) => o.id === id)
  if (from < 0) return
  const objects = [...board.objects]
  const [object] = objects.splice(from, 1)
  objects.splice(Math.max(0, Math.min(toIndex, objects.length)), 0, object)
  set(mapId, { ...board, objects })
}

/** Several changes at once (update, remove, add) as ONE step back; returns the ids of what was added */
export function changeObjects(mapId: string, change: Change): number[] {
  for (const draft of change.add ?? []) if (draft.layer !== undefined) checkLayer(draft.layer)
  for (const { patch } of change.update ?? []) if (patch.layer !== undefined) checkLayer(patch.layer)
  const board = getBoard(mapId)
  const result = applyChange(board, change)
  if (result.board !== board) set(mapId, result.board)
  return result.added
}

/** Gives `to` a copy of `from`'s board with a fresh history (boards never change, so they can share their objects) */
export function copyBoard(from: string, to: string) {
  replace(to, getBoard(from), { past: [], future: [] })
}

/** Forgets a deleted map's board and history */
export function dropBoard(mapId: string) {
  if (!boards.has(mapId)) return
  const nextBoards = new Map(boards)
  nextBoards.delete(mapId)
  const nextHistories = new Map(histories)
  nextHistories.delete(mapId)
  boards = nextBoards
  histories = nextHistories
  listeners.forEach((listener) => listener())
}

/** Goes back one step (nothing happens with none left) */
export function undo(mapId: string) {
  const { past, future } = historyOf(mapId)
  if (past.length === 0) return
  replace(mapId, past[past.length - 1], { past: past.slice(0, -1), future: [getBoard(mapId), ...future] })
}

/** Goes forward again after an undo */
export function redo(mapId: string) {
  const { past, future } = historyOf(mapId)
  if (future.length === 0) return
  replace(mapId, future[0], { past: [...past, getBoard(mapId)], future: future.slice(1) })
}

export const canUndo = (mapId: string) => historyOf(mapId).past.length > 0
export const canRedo = (mapId: string) => historyOf(mapId).future.length > 0
export const useCanUndo = (mapId: string) => useSyncExternalStore(subscribeBoards, () => canUndo(mapId))
export const useCanRedo = (mapId: string) => useSyncExternalStore(subscribeBoards, () => canRedo(mapId))

/** Tests only: every board empty again */
export function resetBoards() {
  histories = new Map()
  boards = new Map()
  listeners.forEach((listener) => listener())
}
