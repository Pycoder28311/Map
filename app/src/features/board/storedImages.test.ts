import { infobox } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { isStoredImage, withStoredImages } from './storedImages'

const GOOD = 'https://images.example.com/map/img/0f8fad5b-d9cb-469f-a165-70867728950e.jpg'
const box = (image: string) => JSON.stringify({ image, banner: null, name: '', rows: [] })

describe('storedImages', () => {
  it('knows the address of a stored picture', () => {
    expect(isStoredImage(GOOD)).toBe(true)
    expect(isStoredImage('https://x.test/photo.jpg')).toBe(false)
    expect(isStoredImage('javascript:alert(1)')).toBe(false)
    expect(isStoredImage(undefined)).toBe(false)
  })

  it('keeps the pictures of an Info box that look stored, and drops other addresses', () => {
    const read = (text: string) => withStoredImages(text, () => infobox.parse(JSON.parse(text)))
    expect(read(box(GOOD)).image).toBe(GOOD)
    expect(read(box('https://evil.test/a.jpg')).image).toBeNull()
    // The base is not left set
    expect(infobox.parse(JSON.parse(box(GOOD))).image).toBeNull()
  })
})
