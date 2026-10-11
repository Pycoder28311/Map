import { describe, expect, it } from 'vitest'
import {
  addPanel,
  allowedEdges,
  borders,
  fromSearchParams,
  keepOnly,
  moveEdges,
  movePanel,
  swapPanels,
  removePanel,
  single,
  slotOf,
  moveSplit,
  paneBox,
  resetSplit,
  segmentOf,
  snapHalf,
  splitFor,
  splitSegments,
  splitLines,
  workspaceHref,
  type WorkspaceLayout,
} from './layout'
import type { PanelRef } from './types'

const A: PanelRef = { type: 'dashboard' }
const B: PanelRef = { type: 'projects' }
const C: PanelRef = { type: 'project', id: 'p1' }
const D: PanelRef = { type: 'map', id: 'm1' }
const E: PanelRef = { type: 'map', id: 'm2' }

const known = (type: string) => ['dashboard', 'projects', 'project', 'map'].includes(type)
const params = (href: string) => new URLSearchParams(href.split('?')[1])

describe('addPanel', () => {
  it('starts a layout from nothing', () => {
    expect(addPanel(null, A)).toEqual({ template: '1', panels: [A] })
  })

  it('splits a single panel on each edge', () => {
    expect(addPanel(single(A), B, { slot: 'a', edge: 'right' })).toEqual({ template: '2-cols', panels: [A, B] })
    expect(addPanel(single(A), B, { slot: 'a', edge: 'left' })).toEqual({ template: '2-cols', panels: [B, A] })
    expect(addPanel(single(A), B, { slot: 'a', edge: 'top' })).toEqual({ template: '2-rows', panels: [B, A] })
    expect(addPanel(single(A), B, { slot: 'a', edge: 'bottom' })).toEqual({ template: '2-rows', panels: [A, B] })
  })

  it('splits a half into a 3-panel layout', () => {
    const cols: WorkspaceLayout = { template: '2-cols', panels: [A, B] }
    expect(addPanel(cols, C, { slot: 'b', edge: 'bottom' })).toEqual({ template: '3-left', panels: [A, B, C] })
    expect(addPanel(cols, C, { slot: 'a', edge: 'top' })).toEqual({ template: '3-right', panels: [B, C, A] })
    const rows: WorkspaceLayout = { template: '2-rows', panels: [A, B] }
    expect(addPanel(rows, C, { slot: 'b', edge: 'right' })).toEqual({ template: '3-top', panels: [A, B, C] })
  })

  it('fills the 4th cell by splitting the big panel', () => {
    const three: WorkspaceLayout = { template: '3-left', panels: [A, B, C] }
    expect(addPanel(three, D, { slot: 'a', edge: 'bottom' })).toEqual({ template: '4', panels: [A, B, D, C] })
  })

  it('places a clicked panel at the next free position (1 → 2 → 3 → 4)', () => {
    const two = addPanel(single(A), B)
    expect(two).toEqual({ template: '2-cols', panels: [A, B] })
    const three = addPanel(two, C)
    expect(three).toEqual({ template: '3-left', panels: [A, B, C] })
    expect(addPanel(three, D).panels).toHaveLength(4)
  })

  it('refuses duplicates, a 5th panel and edges that cannot split', () => {
    const two: WorkspaceLayout = { template: '2-cols', panels: [A, B] }
    expect(addPanel(two, A)).toBe(two)
    const four: WorkspaceLayout = { template: '4', panels: [A, B, C, D] }
    expect(addPanel(four, E)).toBe(four)
    expect(addPanel(two, C, { slot: 'a', edge: 'left' })).toBe(two) // a column only splits top/bottom
  })
})

describe('allowedEdges', () => {
  it('depends on the slot shape and the panel count', () => {
    expect(allowedEdges(single(A), 'a')).toEqual(['left', 'right', 'top', 'bottom'])
    expect(allowedEdges({ template: '2-cols', panels: [A, B] }, 'b')).toEqual(['top', 'bottom'])
    expect(allowedEdges({ template: '2-rows', panels: [A, B] }, 'a')).toEqual(['left', 'right'])
    expect(allowedEdges({ template: '3-left', panels: [A, B, C] }, 'b')).toEqual([])
    expect(allowedEdges({ template: '4', panels: [A, B, C, D] }, 'a')).toEqual([])
  })
})

describe('removePanel', () => {
  it('4 → 3: the neighbour in the same column grows', () => {
    expect(removePanel({ template: '4', panels: [A, B, C, D] }, 'a')).toEqual({ template: '3-left', panels: [C, B, D] })
  })

  it('3 → 2: removing a small panel or the big one', () => {
    const three: WorkspaceLayout = { template: '3-left', panels: [A, B, C] }
    expect(removePanel(three, 'b')).toEqual({ template: '2-cols', panels: [A, C] })
    expect(removePanel(three, 'a')).toEqual({ template: '2-rows', panels: [B, C] })
  })

  it('2 → 1 → nothing', () => {
    expect(removePanel({ template: '2-cols', panels: [A, B] }, 'a')).toEqual(single(B))
    expect(removePanel(single(A), 'a')).toBeNull()
  })
})

describe('keepOnly', () => {
  it('keeps one panel', () => {
    expect(keepOnly({ template: '4', panels: [A, B, C, D] }, 'c')).toEqual(single(C))
  })
})

describe('splitLines', () => {
  it('knows where the resize lines run', () => {
    expect(splitLines('1')).toEqual({ x: { top: false, bottom: false }, y: { left: false, right: false } })
    expect(splitLines('3-left')).toEqual({ x: { top: true, bottom: true }, y: { left: false, right: true } })
    expect(splitLines('4')).toEqual({ x: { top: true, bottom: true }, y: { left: true, right: true } })
  })
})

describe('URL', () => {
  it('round-trips a layout', () => {
    const layout: WorkspaceLayout = { template: '3-left', panels: [A, C, D] }
    const href = workspaceHref(layout)
    expect(href).toBe('/workspace?layout=3-left&panels=dashboard,project:p1,map:m1')
    expect(fromSearchParams(params(href), known)).toEqual(layout)
  })

  it('cleans up hand-edited URLs', () => {
    expect(fromSearchParams(params('/workspace?layout=4&panels=dashboard,nope,dashboard,projects'), known)).toEqual({
      template: '2-cols', // 4 doesn't fit 2 panels
      panels: [A, B],
    })
    expect(fromSearchParams(params('/workspace?panels=map:1,map:2,map:3,map:4,map:5'), known)?.panels).toHaveLength(4)
    expect(fromSearchParams(params('/workspace?panels=nope'), known)).toBeNull()
    expect(fromSearchParams(params('/workspace'), known)).toBeNull()
  })
})

describe('movePanel', () => {
  const cols: WorkspaceLayout = { template: '2-cols', panels: [A, B] }

  it('turns two columns into two rows', () => {
    expect(movePanel(cols, 'a', { slot: 'b', edge: 'bottom' })).toEqual({ template: '2-rows', panels: [B, A] })
    expect(movePanel(cols, 'a', { slot: 'b', edge: 'right' })).toEqual({ template: '2-cols', panels: [B, A] })
  })

  it('is null when nothing would change, or onto itself', () => {
    expect(movePanel(cols, 'a', { slot: 'b', edge: 'left' })).toBeNull()
    expect(movePanel(cols, 'a', { slot: 'a', edge: 'right' })).toBeNull()
  })

  it('with 4 panels, only into the neighbour that grows into its place', () => {
    const four: WorkspaceLayout = { template: '4', panels: [A, B, C, D] }
    // d out: b grows down; d back on top of it = b and d swapped
    expect(movePanel(four, 'd', { slot: 'b', edge: 'top' })).toEqual({ template: '4', panels: [A, D, C, B] })
    // a single cell can't be split
    expect(moveEdges(four, 'd', 'a')).toEqual([])
  })

  it('lists only the edges that change something', () => {
    expect(moveEdges(cols, 'a', 'b')).toEqual(['right', 'top', 'bottom'])
    expect(moveEdges(cols, 'a', 'a')).toEqual([])
  })
})

describe('swapPanels', () => {
  it('swaps two places, keeping the shape', () => {
    const three: WorkspaceLayout = { template: '3-left', panels: [A, B, C] }
    expect(swapPanels(three, 'a', 'c')).toEqual({ template: '3-left', panels: [C, B, A] })
  })

  it('is null onto itself or an empty slot', () => {
    const cols: WorkspaceLayout = { template: '2-cols', panels: [A, B] }
    expect(swapPanels(cols, 'a', 'a')).toBeNull()
    expect(swapPanels(cols, 'a', 'c')).toBeNull()
  })
})


describe('borders', () => {
  it('one per pair of panels a line separates', () => {
    expect(borders('2-cols')).toEqual([{ axis: 'x', part: 'whole', slots: ['a', 'b'] }])
    // a | b above, a | c below: two borders on the same line, then b / c
    expect(borders('3-left')).toEqual([
      { axis: 'x', part: 'start', slots: ['a', 'b'] },
      { axis: 'x', part: 'end', slots: ['a', 'c'] },
      { axis: 'y', part: 'end', slots: ['b', 'c'] },
    ])
    expect(borders('4')).toHaveLength(4)
  })
})

describe('slotOf', () => {
  it('finds the slot a panel sits in', () => {
    const layout = { template: '3-left' as const, panels: [{ type: 'map', id: 'm1' }, { type: 'dashboard' }, { type: 'note', id: 'n1' }] }
    expect(slotOf(layout, { type: 'note', id: 'n1' })).toBe('c')
    expect(slotOf(layout, { type: 'dashboard' })).toBe('b')
    expect(slotOf(layout, { type: 'map', id: 'm9' })).toBeUndefined()
  })
})

describe('lines with halves (2×2)', () => {
  const ids = (template: Parameters<typeof splitSegments>[0], split: Parameters<typeof splitSegments>[1]) =>
    splitSegments(template, split).segments.map((s) => s.id)

  it('keeps halves only for 4 panes, one line at a time, and not when joined', () => {
    expect(splitFor('3-left', { x: 0.4, y: 0.5, x2: 0.6 })).toEqual({ x: 0.4, y: 0.5 })
    expect(splitFor('4', { x: 0.4, y: 0.5, x2: 0.6, y2: 0.3 })).toEqual({ x: 0.4, y: 0.5, x2: 0.6 })
    expect(splitFor('4', { x: 0.4, y: 0.5, y2: 0.3 })).toEqual({ x: 0.4, y: 0.5, y2: 0.3 })
    expect(splitFor('4', { x: 0.4, y: 0.5, x2: 0.4 })).toEqual({ x: 0.4, y: 0.5 })
  })

  it("boxes each pane by its own row's / column's line, without overlaps", () => {
    const split = { x: 0.3, y: 0.5, x2: 0.7 }
    expect(paneBox('4', 'a', split)).toEqual({ x0: 0, x1: 0.3, y0: 0, y1: 0.5 })
    expect(paneBox('4', 'b', split)).toEqual({ x0: 0.3, x1: 1, y0: 0, y1: 0.5 })
    expect(paneBox('4', 'c', split)).toEqual({ x0: 0, x1: 0.7, y0: 0.5, y1: 1 })
    expect(paneBox('4', 'd', split)).toEqual({ x0: 0.7, x1: 1, y0: 0.5, y1: 1 })
    expect(paneBox('4', 'b', { x: 0.5, y: 0.4, y2: 0.6 })).toEqual({ x0: 0.5, x1: 1, y0: 0, y1: 0.6 })
    expect(paneBox('3-left', 'a', { x: 0.4, y: 0.5 })).toEqual({ x0: 0, x1: 0.4, y0: 0, y1: 1 })
    expect(paneBox('2-cols', 'c', { x: 0.5, y: 0.5 })).toBeNull()
  })

  it('offers halves and the corner when joined; one line whole and no corner once split', () => {
    expect(ids('4', { x: 0.5, y: 0.5 })).toEqual(['x-top', 'x-bottom', 'y-left', 'y-right'])
    expect(splitSegments('4', { x: 0.5, y: 0.5 }).corner).toBe(true)
    expect(ids('4', { x: 0.5, y: 0.5, x2: 0.6 })).toEqual(['x-top', 'x-bottom', 'y'])
    expect(splitSegments('4', { x: 0.5, y: 0.5, x2: 0.6 }).corner).toBe(false)
    expect(ids('4', { x: 0.5, y: 0.5, y2: 0.6 })).toEqual(['x', 'y-left', 'y-right'])
    expect(ids('3-top', { x: 0.5, y: 0.5 })).toEqual(['x', 'y'])
    expect(splitSegments('3-top', { x: 0.5, y: 0.5 }).segments[0].part).toBe('end')
    expect(segmentOf('4', { x: 0.5, y: 0.5, y2: 0.6 }, { axis: 'x', part: 'end' })).toBe('x')
    expect(segmentOf('4', { x: 0.5, y: 0.5 }, { axis: 'x', part: 'end' })).toBe('x-bottom')
  })

  it('moves one half, freezing its partner, and snaps within 12px', () => {
    const size = { width: 1000, height: 600 }
    expect(moveSplit({ x: 0.5, y: 0.5 }, 'x-top', { x: 0.3, y: 0 }, size)).toEqual({ x: 0.3, y: 0.5, x2: 0.5 })
    expect(moveSplit({ x: 0.3, y: 0.5, x2: 0.5 }, 'x-top', { x: 0.495, y: 0 }, size)).toEqual({ x: 0.5, y: 0.5, x2: 0.5 })
    expect(moveSplit({ x: 0.3, y: 0.5, x2: 0.5 }, 'x-bottom', { x: 0.31, y: 0 }, size).x2).toBe(0.3)
    expect(moveSplit({ x: 0.5, y: 0.5 }, 'y-right', { x: 0, y: 0.7 }, size)).toEqual({ x: 0.5, y: 0.5, y2: 0.7 })
    expect(moveSplit({ x: 0.3, y: 0.5, x2: 0.5 }, 'y', { x: 0, y: 0.6 }, size)).toEqual({ x: 0.3, y: 0.6, x2: 0.5 })
    expect(snapHalf(0.51, 0.5, 1000)).toBe(0.5)
    expect(snapHalf(0.52, 0.5, 1000)).toBe(0.52)
  })

  it('rejoins halves halfway on reset', () => {
    expect(resetSplit({ x: 0.3, y: 0.5, x2: 0.5 }, 'x-bottom')).toEqual({ x: 0.4, y: 0.5 })
    expect(resetSplit({ x: 0.3, y: 0.4, y2: 0.6 }, 'xy')).toEqual({ x: 0.5, y: 0.5 })
  })
})
