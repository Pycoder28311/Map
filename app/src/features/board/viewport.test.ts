import { describe, expect, it } from 'vitest'
import { actualView, fitBounds, BOARD, boardToScreen, clampToBoard, clampView, fitView, FIT_MARGIN, insideBoard, KEEP_VISIBLE, panBy, screenToBoard, zoomAt, zoomFactorOf, ZOOM } from './viewport'

const size = { w: 1000, h: 700 }

describe('fitView', () => {
  it('centres the board and keeps the margin', () => {
    const v = fitView(size)
    expect(v.scale).toBeCloseTo(Math.min((1000 - 2 * FIT_MARGIN) / BOARD.width, (700 - 2 * FIT_MARGIN) / BOARD.height))
    expect(v.x + (BOARD.width * v.scale) / 2).toBeCloseTo(500)
    expect(v.y + (BOARD.height * v.scale) / 2).toBeCloseTo(350)
  })

  it('does not enlarge a lot in a huge window, and stays above the minimum in a tiny one', () => {
    expect(fitView({ w: 10000, h: 10000 }).scale).toBe(1.5)
    expect(fitView({ w: 10, h: 10 }).scale).toBe(ZOOM.min)
  })

  it('actualView is 100% and centred', () => {
    expect(actualView(size)).toEqual({ scale: 1, x: (1000 - BOARD.width) / 2, y: (700 - BOARD.height) / 2 })
  })
})

describe('zoomAt', () => {
  it('keeps the board point under the pointer where it was', () => {
    const view = { scale: 0.5, x: 100, y: 60 }
    const at = { x: 400, y: 300 }
    const before = screenToBoard(view, at)
    const next = zoomAt(view, at, 2, size)
    expect(next.scale).toBe(1)
    const after = screenToBoard(next, at)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('stops at the limits', () => {
    expect(zoomAt({ scale: 7, x: 0, y: 0 }, { x: 0, y: 0 }, 100, size).scale).toBe(ZOOM.max)
    expect(zoomAt({ scale: 0.2, x: 0, y: 0 }, { x: 0, y: 0 }, 0.001, size).scale).toBe(ZOOM.min)
  })
})

describe('clampView / panBy', () => {
  it('keeps some of the board in view on every side', () => {
    const view = { scale: 1, x: 0, y: 0 }
    expect(panBy(view, 99999, 99999, size)).toMatchObject({ x: size.w - KEEP_VISIBLE, y: size.h - KEEP_VISIBLE })
    expect(panBy(view, -99999, -99999, size)).toMatchObject({ x: KEEP_VISIBLE - BOARD.width, y: KEEP_VISIBLE - BOARD.height })
  })

  it('leaves a view that is already fine alone', () => {
    const view = fitView(size)
    expect(clampView(view, size)).toEqual(view)
  })
})

describe('coordinates', () => {
  it('screenToBoard and boardToScreen are inverses', () => {
    const view = { scale: 2.5, x: -40, y: 12 }
    const p = { x: 321, y: 77 }
    const back = screenToBoard(view, boardToScreen(view, p))
    expect(back.x).toBeCloseTo(p.x)
    expect(back.y).toBeCloseTo(p.y)
  })

  it('knows the sheet and clamps to it', () => {
    expect(insideBoard({ x: 0, y: 1000 })).toBe(true)
    expect(insideBoard({ x: -1, y: 5 })).toBe(false)
    expect(clampToBoard({ x: -5, y: 2000 })).toEqual({ x: 0, y: BOARD.height })
  })
})

describe('zoomFactorOf', () => {
  it('zooms in for a wheel up and out for a wheel down', () => {
    expect(zoomFactorOf({ deltaY: -100, deltaMode: 0, ctrlKey: false })).toBeGreaterThan(1)
    expect(zoomFactorOf({ deltaY: 100, deltaMode: 0, ctrlKey: false })).toBeLessThan(1)
  })

  it('counts lines as 16 pixels and a pinch (ctrlKey) as much stronger', () => {
    expect(zoomFactorOf({ deltaY: 1, deltaMode: 1, ctrlKey: false })).toBeCloseTo(zoomFactorOf({ deltaY: 16, deltaMode: 0, ctrlKey: false }))
    expect(zoomFactorOf({ deltaY: -5, deltaMode: 0, ctrlKey: true })).toBeGreaterThan(zoomFactorOf({ deltaY: -5, deltaMode: 0, ctrlKey: false }))
  })
})

describe('fitBounds', () => {
  it('centres the rectangle and fits it with the margin', () => {
    const v = fitBounds({ x: 400, y: 300, w: 200, h: 100 }, size)
    expect(v.x + 500 * v.scale).toBeCloseTo(500)
    expect(v.y + 350 * v.scale).toBeCloseTo(350)
    expect(v.scale).toBeCloseTo(Math.min((1000 - 192) / 200, (700 - 192) / 100, 4))
  })

  it('does not zoom in more than the cap for a tiny rectangle, or out past the minimum for a huge one', () => {
    expect(fitBounds({ x: 10, y: 10, w: 1, h: 1 }, size).scale).toBe(4)
    expect(fitBounds({ x: 0, y: 0, w: 1e6, h: 1e6 }, size).scale).toBe(ZOOM.min)
  })
})
