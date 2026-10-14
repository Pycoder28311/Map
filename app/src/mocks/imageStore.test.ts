import { beforeAll, describe, expect, it } from 'vitest'
import { getImageUrl, putImage } from './imageStore'

beforeAll(() => {
  let n = 0
  URL.createObjectURL = () => `blob:test-${n++}`
})

describe('imageStore', () => {
  it('keeps a picture under a new id', () => {
    const a = putImage(new Blob(['a']))
    const b = putImage(new Blob(['b']))
    expect(a).not.toBe(b)
    expect(getImageUrl(a)).toMatch(/^blob:/)
  })
  it('knows nothing of an unknown id', () => {
    expect(getImageUrl('nope')).toBeUndefined()
    expect(getImageUrl(undefined)).toBeUndefined()
  })
})
