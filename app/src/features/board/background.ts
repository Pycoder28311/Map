// The picture every map starts with behind its objects (a fantasy world map), and which maps have taken it off. Taking it off is
// a choice of this browser (kept, like the open sections of the sidebar), not part of the map's file.
import { useSyncExternalStore } from 'react'
import url from '../../assets/board-background.jpg'

const KEY = 'map.backgroundOff.v1'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// The maps that have no background
let off = new Set<string>()
try {
  off = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
} catch {
  // No storage (private window…): every map starts with it
}

/** Takes the background off a map (it stays off) */
export function removeBackground(mapId: string) {
  off = new Set(off).add(mapId)
  try {
    localStorage.setItem(KEY, JSON.stringify([...off]))
  } catch {
    // Not saved, still off
  }
  notify()
}

// The picture, loaded the first time it is asked for; `ready` changes when it has arrived
let image: HTMLImageElement | null = null
let ready = false
function load() {
  if (image || typeof Image === 'undefined') return
  image = new Image()
  image.onload = () => {
    ready = true
    notify()
  }
  image.src = url
}

// A map's own background picture (the address of an image the app stored, kept in its file: Board.background), loaded the first time it is
// asked for. Tried with CORS first, so the map can still be made into a picture; without, when the images' server does not allow it
const own = new Map<string, { image: HTMLImageElement; ready: boolean }>()
function loadOwn(address: string) {
  let known = own.get(address)
  if (known || typeof Image === 'undefined') return known
  const entry = { image: new Image(), ready: false }
  own.set(address, (known = entry))
  let withCors = true
  entry.image.crossOrigin = 'anonymous'
  entry.image.onload = () => {
    entry.ready = true
    notify()
  }
  entry.image.onerror = () => {
    if (!withCors) return
    withCors = false
    entry.image.removeAttribute('crossorigin')
    entry.image.src = address
  }
  entry.image.src = address
  return known
}

/**
 * The picture to paint behind the objects of this map: its own when it has one (`address`, from its board), else the default one (null when it
 * was taken off or has not arrived yet: the painter is asked again when it has)
 */
export function useBackground(mapId: string, address?: string): CanvasImageSource | null {
  const loaded = useSyncExternalStore(subscribe, () => ready)
  const taken = useSyncExternalStore(subscribe, () => off.has(mapId))
  const mine = useSyncExternalStore(subscribe, () => (address ? (own.get(address)?.ready ?? false) : false))
  if (address) {
    const entry = loadOwn(address)
    return mine && entry ? entry.image : null
  }
  load()
  return !taken && loaded ? image : null
}
