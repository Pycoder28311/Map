// The PNG Download gives: the drawing as seen, each unit `scale × scale` real pixels (whole pixels only), transparent where nothing is.
import { flatten } from '../model/raster'
import type { Drawing } from '../model/types'

/** A canvas of the drawing, `scale` pixels per unit */
export function drawingCanvas(d: Drawing, scale = d.exportScale): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = d.width * scale
  canvas.height = d.height * scale
  const ctx = canvas.getContext('2d')!
  const cells = flatten(d)
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const color = cells[y * d.width + x]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  return canvas
}

export const pngBlob = (d: Drawing, scale?: number) =>
  new Promise<Blob>((resolve, reject) => drawingCanvas(d, scale).toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser could not make the PNG'))), 'image/png'))

/** Saves a file through the browser's download */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
