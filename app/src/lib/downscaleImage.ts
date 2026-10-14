// Makes a picked picture small enough to keep: the longest side at most `max`, as JPEG.

/** The size that fits `max` on the longest side, never larger than the original */
export function fitSize(w: number, h: number, max: number) {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

export class NotAnImage extends Error {
  constructor() {
    super('That file is not a picture the browser can read')
  }
}

export async function downscaleImage(file: Blob, max = 1280): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new NotAnImage()
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new NotAnImage()
  }
  const { w, h } = fitSize(bitmap.width, bitmap.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new NotAnImage()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new NotAnImage())), 'image/jpeg', 0.82))
}
