import { afterEach, describe, expect, it } from 'vitest'
import { getPointPen, setPointPen, getBorderPen, getPen, getTextPen, resetPen, setBorderPen, setPen, setTextPen } from './pen'

afterEach(resetPen)

describe('pen', () => {
  it('starts as the plain pencil', () => {
    expect(getPen().shape).toBeNull()
    expect(getPen().style.way).toBe('exact')
  })

  it('changes only what is given', () => {
    setPen({ shape: 'star', param: 5 })
    expect(getPen()).toMatchObject({ shape: 'star', param: 5, fill: null })
  })
})

describe('border pen', () => {
  it('starts with a light inside and is separate from the line pen', () => {
    expect(getBorderPen().fill).toEqual({ color: getBorderPen().style.color, opacity: 20 })
    setBorderPen({ shape: 'hexagon' })
    expect(getPen().shape).toBeNull()
    resetPen()
    expect(getBorderPen().shape).toBeNull()
  })
})

describe('text pen', () => {
  it('starts with the default text look and resets', () => {
    expect(getTextPen()).toMatchObject({ size: 24, align: 'left', opacity: 100 })
    setTextPen({ size: 40 })
    expect(getTextPen().size).toBe(40)
    resetPen()
    expect(getTextPen().size).toBe(24)
  })
})

describe('point pen', () => {
  it('starts as a plain red pin and changes only what is given', () => {
    expect(getPointPen()).toEqual({ label: 'other', icon: 'pin', color: '#dc2626' })
    setPointPen({ label: 'city' })
    expect(getPointPen()).toMatchObject({ label: 'city', icon: 'pin' })
  })
})
