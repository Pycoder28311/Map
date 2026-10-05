export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp'

/** Detects the real image type from the file's first bytes; null if it isn't a JPEG, PNG or WebP */
export async function detectImageType(file: File): Promise<ImageType | null> {
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer())

    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'

    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    if (png.every((byte, i) => b[i] === byte)) return 'image/png'

    const riff = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 // "RIFF"
    const webp = b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
    if (riff && webp) return 'image/webp'

    return null
}
