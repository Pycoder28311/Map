// Each map's board (what is drawn on it), in memory while it is edited. It is read from its file on the server once when the map
// opens (loadBoard) and written back only when Save is pressed (saveBoard; docs/plans/38). The UI only uses what's exported here.
// Every change makes new objects and arrays, so an earlier board stays as it was (undo can keep it), and "unsaved" is simply
// "not the board that was saved" (a reference compare: undoing back to it is saved again).
import { useEffect, useSyncExternalStore } from 'react'
import { ApiError } from '../../lib/api/client'
import { getMapFile, saveMapFile } from '../../lib/api/maps'
import { boardFromFile, boardToFile } from '../projects/compress'
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

const notify = () => listeners.forEach((listener) => listener())

function replace(mapId: string, board: Board, history: History) {
  boards = new Map(boards).set(mapId, board)
  histories = new Map(histories).set(mapId, history)
  notify()
}

/* ─────────────── The server's file (docs/plans/38) ─────────────── */

/** Where a map's board is: being read, read, failed, or gone (deleted, or not the user's) */
export type BoardLoad = { status: 'loading' } | { status: 'ready' } | { status: 'error'; error: string } | { status: 'gone' }
const IDLE: BoardLoad = { status: 'loading' }
let loads = new Map<string, BoardLoad>()
/** The board the server has (the one read or last saved) and its file's version */
let saved = new Map<string, { board: Board; version: number }>()
/** The maps whose Save is on its way */
let saving = new Set<string>()

/** Another version of the map was saved since this one was read (another tab or device): its number */
export class MapConflict extends Error {
  version: number
  constructor(version: number) {
    super('A newer version of this map was saved')
    this.version = version
  }
}

function setLoad(mapId: string, load: BoardLoad) {
  loads = new Map(loads).set(mapId, load)
  notify()
}

/** Takes `board` as the server's, at `version`: shown with no steps back, and saved */
export function markSaved(mapId: string, board: Board, version: number) {
  saved = new Map(saved).set(mapId, { board, version })
  loads = new Map(loads).set(mapId, { status: 'ready' })
  replace(mapId, board, { past: [], future: [] })
}

/** Reads the map's file once (two calls at the same time are one request); `force`: read it again (Try again, or the saved one after a conflict) */
export async function loadBoard(mapId: string, force = false) {
  const known = loads.get(mapId)
  if (known && (known.status === 'loading' || (!force && known.status !== 'error'))) return
  setLoad(mapId, { status: 'loading' })
  try {
    const { file, version } = await getMapFile(mapId)
    markSaved(mapId, file ? await boardFromFile(file) : emptyBoard(), version)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) setLoad(mapId, { status: 'gone' })
    else setLoad(mapId, { status: 'error', error: error instanceof Error ? error.message : 'The map could not be read' })
  }
}

/** The map's board read from the server when it is not yet (null id: none) */
export function useBoardLoad(mapId: string | null): BoardLoad {
  const load = useSyncExternalStore(subscribeBoards, () => (mapId === null ? IDLE : (loads.get(mapId) ?? IDLE)))
  useEffect(() => {
    if (mapId !== null) void loadBoard(mapId)
  }, [mapId])
  return load
}

/** Changes not saved yet (a map that was never read has none) */
export function isDirty(mapId: string) {
  const known = saved.get(mapId)
  return !!known && getBoard(mapId) !== known.board
}

export const isSaving = (mapId: string) => saving.has(mapId)

/** Whether the map has changes not saved, and whether its Save is on its way */
export function useSaveState(mapId: string) {
  const dirty = useSyncExternalStore(subscribeBoards, () => isDirty(mapId))
  const busy = useSyncExternalStore(subscribeBoards, () => isSaving(mapId))
  return { dirty, saving: busy }
}

/**
 * Saves the board as it is now (Save): its file over the version that was read. Changes made while it is on its way stay unsaved.
 * Another version saved since: MapConflict (takeServers / saveOver decide)
 */
export async function saveBoard(mapId: string) {
  const known = saved.get(mapId)
  if (!known || saving.has(mapId)) return
  const board = getBoard(mapId)
  saving = new Set(saving).add(mapId)
  notify()
  try {
    const result = await saveMapFile(mapId, await boardToFile(board), known.version)
    saved = new Map(saved).set(mapId, { board, version: result.version })
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new MapConflict(Number(error.details.find((d) => d.path === 'version')?.message ?? known.version))
    }
    throw error
  } finally {
    const next = new Set(saving)
    next.delete(mapId)
    saving = next
    notify()
  }
}

/** After a conflict: Save mine over the newer version (the next save replaces `version`) */
export async function saveOver(mapId: string, version: number) {
  const known = saved.get(mapId)
  if (!known) return
  saved = new Map(saved).set(mapId, { ...known, version })
  await saveBoard(mapId)
}

/** After a conflict: take the saved one (what was not saved here is dropped) */
export const takeServers = (mapId: string) => loadBoard(mapId, true)

/** Some map has changes not saved */
export const anyDirty = () => [...saved.keys()].some(isDirty)

// Leaving the page with changes not saved asks first (Save is the only way they reach the server)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (!anyDirty()) return
    e.preventDefault()
    e.returnValue = ''
  })
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

/** Changes whenever any board does (a screen that shows several maps: the presenter) */
export const useBoardsChanged = () => useSyncExternalStore(subscribeBoards, () => boards)

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

/** Gives `to` a copy of `from`'s board with a fresh history (boards never change, so they can share their objects); `version`: it is already the server's file at that version (a branch) */
export function copyBoard(from: string, to: string, version?: number) {
  if (version !== undefined) return markSaved(to, getBoard(from), version)
  replace(to, getBoard(from), { past: [], future: [] })
}

/** Forgets a deleted map's board and history */
export function dropBoard(mapId: string) {
  if (!boards.has(mapId)) return forgetFile(mapId)
  const nextBoards = new Map(boards)
  nextBoards.delete(mapId)
  const nextHistories = new Map(histories)
  nextHistories.delete(mapId)
  boards = nextBoards
  histories = nextHistories
  forgetFile(mapId)
  notify()
}

function forgetFile(mapId: string) {
  saved = new Map(saved)
  saved.delete(mapId)
  loads = new Map(loads)
  loads.delete(mapId)
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
  saved = new Map()
  loads = new Map()
  saving = new Set()
  listeners.forEach((listener) => listener())
}
