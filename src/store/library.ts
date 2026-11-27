// The asset library: every drawing kept in this browser's local storage, one of them open on the board. It starts with the Map app's
// own assets (library/defaults.ts: the article book card). The open drawing is written back a second after each change, and before
// another one opens. Nothing leaves the browser: there is no server.
import { useSyncExternalStore } from 'react'
import { deserializeDrawing, serializeDrawing } from '../export/dataFile'
import { DEFAULT_ASSETS, drawingOf, type DefaultAsset } from '../library/defaults'
import { newDrawing } from '../model/normalize'
import type { Drawing } from '../model/types'
import { getState, hydrate, replaceDrawing, setNotice, subscribe as subscribeStore, type Settings } from './store'

export const LIBRARY_KEY = 'pixel-board:library'
export const CURRENT_KEY = 'pixel-board:current'
const SETTINGS_KEY = 'pixel-board:settings'
/** Before the library: one drawing alone (read once, then kept as an asset) */
const OLD_DRAWING_KEY = 'pixel-board:drawing'

/** One asset: its drawing as JSON (serializeDrawing), and what the list shows without reading it */
export type Entry = { id: string; name: string; width: number; height: number; updatedAt: number; drawing: unknown }

let entries: Entry[] = []
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

/** The assets, newest change first */
export function useLibrary(): Entry[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => entries,
  )
}

const newEntryId = () => `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const entryOf = (id: string, d: Drawing): Entry => ({ id, name: d.name, width: d.width, height: d.height, updatedAt: Date.now(), drawing: serializeDrawing(d) })

function write() {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries))
    const id = getState().assetId
    if (id) localStorage.setItem(CURRENT_KEY, id)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(getState().settings))
    return true
  } catch {
    setNotice('Could not save in this browser (storage full or blocked). Download your work to keep it.')
    return false
  }
}

const sortEntries = () => {
  entries = [...entries].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Writes the open drawing into its asset (now) */
export function saveCurrent() {
  const { assetId, drawing } = getState()
  if (!assetId) return
  let entry: Entry
  try {
    entry = entryOf(assetId, drawing)
  } catch (e) {
    // More than 62 colours on the paint layer: it can't be written as rows
    setNotice(e instanceof Error ? e.message : 'Could not save this drawing.')
    return
  }
  entries = entries.some((e) => e.id === assetId) ? entries.map((e) => (e.id === assetId ? entry : e)) : [entry, ...entries]
  sortEntries()
  write()
  changed()
}

/** Reads the library (and the settings) at start; the first time, it holds the default assets and opens the first */
export function restore() {
  let notice: string | null = null
  let settings: Partial<Settings> | undefined
  try {
    const text = localStorage.getItem(LIBRARY_KEY)
    if (text) entries = (JSON.parse(text) as Entry[]).filter((e) => e && typeof e.id === 'string')
    const s = localStorage.getItem(SETTINGS_KEY)
    if (s) settings = JSON.parse(s) as Partial<Settings>
  } catch {
    notice = 'The saved assets could not be read: starting again with the defaults.'
    entries = []
  }
  if (entries.length === 0) {
    // The first time: the default assets, and a drawing kept before the library existed
    entries = DEFAULT_ASSETS.map((a, i) => ({ ...entryOf(newEntryId(), drawingOf(a)), updatedAt: Date.now() - i }))
    try {
      const old = localStorage.getItem(OLD_DRAWING_KEY)
      const drawing = old ? deserializeDrawing(JSON.parse(old)) : null
      if (drawing) entries.unshift(entryOf(newEntryId(), drawing))
    } catch {
      // nothing to bring over
    }
  }
  sortEntries()
  let current: string | null = null
  try {
    current = localStorage.getItem(CURRENT_KEY)
  } catch {
    // storage blocked
  }
  const entry = entries.find((e) => e.id === current) ?? entries[0]
  const drawing = deserializeDrawing(entry.drawing)
  if (!drawing) notice = `“${entry.name}” could not be read: it opens empty.`
  hydrate({ drawing: drawing ?? newDrawing(entry.width, entry.height, entry.name), assetId: entry.id, ...(settings ? { settings: settings as Settings } : {}) }, notice)
  write()
  changed()
}

/** Keeps the open drawing (and the settings) a second after the last change */
export function keepSaving() {
  let timer = 0
  let last = getState()
  return subscribeStore(() => {
    const s = getState()
    // A stroke paints in place, then ends with a new drawing object: that one is saved. The view and the sheet alone are not
    if (s.drawing === last.drawing && s.settings === last.settings) return
    last = s
    window.clearTimeout(timer)
    timer = window.setTimeout(saveCurrent, 1000)
  })
}

/** Opens an asset (the open one is saved first) */
export function openAsset(id: string) {
  if (id === getState().assetId) return
  saveCurrent()
  const entry = entries.find((e) => e.id === id)
  if (!entry) return
  const drawing = deserializeDrawing(entry.drawing)
  if (!drawing) return setNotice(`“${entry.name}” could not be read.`)
  replaceDrawing(drawing, id)
  setNotice(null)
  write()
}

/** A new asset, opened at once */
export function addAsset(drawing: Drawing) {
  saveCurrent()
  const id = newEntryId()
  entries = [entryOf(id, drawing), ...entries]
  replaceDrawing(drawing, id)
  write()
  changed()
}

export const newAsset = (width: number, height: number, name = 'New asset') => addAsset(newDrawing(width, height, name))

/** A copy of an asset, opened */
export function duplicateAsset(id: string) {
  if (id === getState().assetId) saveCurrent()
  const entry = entries.find((e) => e.id === id)
  const drawing = entry && deserializeDrawing(entry.drawing)
  if (drawing) addAsset({ ...drawing, name: `${drawing.name} copy` })
}

/** Removes an asset; the open one: another opens (a new empty one when none is left) */
export function deleteAsset(id: string) {
  entries = entries.filter((e) => e.id !== id)
  if (id === getState().assetId) {
    const next = entries[0]
    const drawing = next && deserializeDrawing(next.drawing)
    if (next && drawing) replaceDrawing(drawing, next.id)
    else {
      const blank = newDrawing(64, 64, 'New asset')
      const fresh = newEntryId()
      entries = [entryOf(fresh, blank)]
      replaceDrawing(blank, fresh)
    }
  }
  write()
  changed()
}

/** A default asset added again (as a new copy) */
export const addDefault = (asset: DefaultAsset) => addAsset(drawingOf(asset))

/** Tests: start again */
export const resetLibrary = () => {
  entries = []
}
