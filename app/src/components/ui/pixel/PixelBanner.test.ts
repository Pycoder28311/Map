import { describe, expect, it } from 'vitest'
import { bannerClip } from './PixelBanner'

describe('bannerClip', () => {
  it('is none for a straight bottom', () => {
    expect(bannerClip('flat', 12)).toBe('none')
    expect(bannerClip('point', 0)).toBe('none')
  })
  it('a point goes down to the middle in one step per pixel each way', () => {
    const clip = bannerClip('point', 3)
    expect(clip.startsWith('polygon(0 0, 100% 0, ')).toBe(true)
    expect(clip).toContain('50% 100%')
    // 3 steps × 2 corners × 2 sides, the two top corners and the point
    expect(clip.split(',').length).toBe(2 + 3 * 2 * 2 + 1)
  })
  it('a swallowtail keeps the bottom corners and cuts up to the middle', () => {
    const clip = bannerClip('swallow', 4)
    expect(clip).toContain('100% 100%')
    expect(clip).toContain('0 100%')
    expect(clip).toContain('50% calc(100% - 4 * var(--scroll-u))')
  })
})
