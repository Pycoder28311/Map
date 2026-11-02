import { describe, expect, it } from 'vitest'
import { signClip } from './PixelSign'

describe('signClip', () => {
  it('is none without cuts', () => expect(signClip([], [])).toBe('none'))
  it('cuts the top left to right and the bottom right to left', () => {
    const clip = signClip([60, 20], [30, 70])
    expect(clip.indexOf('20% 0')).toBeLessThan(clip.indexOf('60% 0'))
    expect(clip.indexOf('70% 100%')).toBeLessThan(clip.indexOf('30% 100%'))
  })
})
