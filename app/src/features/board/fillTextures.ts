// The textures an area's inside can have (saved as the index, so new ones are only ever added at the end) and the pictures it can
// be filled with. A texture is a small tile in the fill's colour, repeated over the area in board units, so it zooms with the map.
import { useSyncExternalStore } from 'react'
import { getImageUrl } from '../../mocks/imageStore'

export const TEXTURES = [
  { label: 'Solid' },
  { label: 'Stripes' },
  { label: 'Cross-hatch' },
  { label: 'Dots' },
  { label: 'Grid' },
  { label: 'Waves' },
] as const

const TILE = 16
const tiles = new Map<string, CanvasPattern>()

function drawTile(g: CanvasRenderingContext2D, texture: number, color: string) {
  g.strokeStyle = color
  g.fillStyle = color
  g.lineWidth = 2
  g.lineCap = 'square'
  g.beginPath()
  if (texture === 1 || texture === 2) {
    // Diagonals that run on across the tile edges
    for (const k of [-TILE, 0, TILE]) {
      g.moveTo(k, TILE)
      g.lineTo(k + TILE, 0)
    }
    if (texture === 2)
      for (const k of [-TILE, 0, TILE]) {
        g.moveTo(k, 0)
        g.lineTo(k + TILE, TILE)
      }
    g.stroke()
  } else if (texture === 3) {
    g.arc(TILE / 2, TILE / 2, 2.2, 0, Math.PI * 2)
    g.fill()
  } else if (texture === 4) {
    g.moveTo(0, 1)
    g.lineTo(TILE, 1)
    g.moveTo(1, 0)
    g.lineTo(1, TILE)
    g.lineWidth = 1.5
    g.stroke()
  } else if (texture === 5) {
    g.moveTo(0, TILE / 2)
    g.bezierCurveTo(TILE / 4, 0, (TILE * 3) / 4, TILE, TILE, TILE / 2)
    g.lineWidth = 1.5
    g.stroke()
  }
}

/** The repeating pattern for a texture in a colour; null for solid (or an unknown texture, or no canvas to make it on) */
export function texturePattern(ctx: CanvasRenderingContext2D, texture: number | undefined, color: string): CanvasPattern | null {
  if (!texture || texture < 1 || texture >= TEXTURES.length || typeof document === 'undefined') return null
  const key = `${texture}:${color}`
  let pattern = tiles.get(key)
  if (!pattern) {
    const tile = document.createElement('canvas')
    tile.width = tile.height = TILE
    const g = tile.getContext('2d')
    if (!g) return null
    drawTile(g, texture, color)
    pattern = ctx.createPattern(tile, 'repeat') ?? undefined
    if (!pattern) return null
    tiles.set(key, pattern)
  }
  return pattern
}

// The pictures, loaded when first asked for; the version changes as each arrives, so what shows them paints again
const images = new Map<string, HTMLImageElement>()
const listeners = new Set<() => void>()
let version = 0

/** The loaded picture, or null while it has not arrived (or is not in the store) */
export function fillImage(id: string): HTMLImageElement | null {
  const known = images.get(id)
  if (known) return known.complete && known.naturalWidth > 0 ? known : null
  const url = getImageUrl(id)
  if (!url || typeof Image === 'undefined') return null
  const image = new Image()
  image.onload = () => {
    version++
    listeners.forEach((l) => l())
  }
  image.src = url
  images.set(id, image)
  return null
}

/** Changes when a picture an area is filled with has arrived (use it to paint again) */
export const useFillImages = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
