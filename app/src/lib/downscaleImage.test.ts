import { describe, expect, it } from 'vitest'
import { fitSize } from './downscaleImage'

describe('fitSize', () => {
  it('shrinks the longest side to the limit and keeps the ratio', () => {
    expect(fitSize(4000, 2000, 1000)).toEqual({ w: 1000, h: 500 })
    expect(fitSize(1000, 3000, 1500)).toEqual({ w: 500, h: 1500 })
  })
  it('never makes a small picture bigger', () => {
    expect(fitSize(300, 200, 1280)).toEqual({ w: 300, h: 200 })
  })
})
