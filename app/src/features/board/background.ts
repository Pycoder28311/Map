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

/** The picture to paint behind the objects of this map: null when it was taken off or has not arrived yet (the painter is asked again when it has) */
export function useBackground(mapId: string): CanvasImageSource | null {
  const loaded = useSyncExternalStore(subscribe, () => ready)
  const taken = useSyncExternalStore(subscribe, () => off.has(mapId))
  load()
  return !taken && loaded ? image : null
}

/** Whether the map has its background on (the button to remove it shows) */
export const useHasBackground = (mapId: string) => useSyncExternalStore(subscribe, () => !off.has(mapId))
