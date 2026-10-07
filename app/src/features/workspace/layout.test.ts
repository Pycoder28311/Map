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
