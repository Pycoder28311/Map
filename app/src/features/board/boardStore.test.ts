import { POINT_DEFAULT } from './pointLabels'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyBoard, dropBoard, addObject, canRedo, changeObjects, canUndo, getBoard, HISTORY_LIMIT, moveObject, redo, undo, removeObject, resetBoards, subscribeBoards, updateObject, type Draft } from './boardStore'
import { mergeBorders } from './borders'
import { DEFAULT_STYLE } from './style'
import { LAYER_BACKGROUND, LAYER_MAIN, type BorderObject } from './types'

const point = (x = 0): Draft => ({ kind: 'point', name: '', links: [], anchor: { x, y: 0 }, ...POINT_DEFAULT })
const line = (): Draft => ({ kind: 'line', name: '', links: [], style: DEFAULT_STYLE, points: [{ x: 0, y: 0 }] })

beforeEach(resetBoards)

describe('boardStore', () => {
  it('adds on top with rising ids and the drawing layer', () => {
    expect(addObject('m1', point())).toBe(1)
    expect(addObject('m1', line())).toBe(2)
    const board = getBoard('m1')
    expect(board.objects.map((o) => [o.id, o.layer])).toEqual([[1, LAYER_MAIN], [2, LAYER_MAIN]])
    expect(board.nextId).toBe(3)
  })

  it('inserts at a position', () => {
    addObject('m1', point())
    addObject('m1', point())
    addObject('m1', line(), 0)
    expect(getBoard('m1').objects.map((o) => o.id)).toEqual([3, 1, 2])
  })

  it('keeps each map apart and gives the same empty board for a new map', () => {
    addObject('m1', point())
    expect(getBoard('m2').objects).toEqual([])
    expect(getBoard('m2')).toBe(getBoard('m3'))
  })

  it('updates fields, ignores id, kind and unknown ids', () => {
    const id = addObject('m1', point())
    updateObject('m1', id, { name: 'Athens', anchor: { x: 5, y: 6 } })
    updateObject('m1', id, { id: 99, kind: 'line' } as never)
    expect(getBoard('m1').objects[0]).toMatchObject({ id, kind: 'point', name: 'Athens', anchor: { x: 5, y: 6 } })
    const before = getBoard('m1')
    updateObject('m1', 77, { name: 'x' })
    expect(getBoard('m1')).toBe(before)
  })

  it('removes an object and the links to it', () => {
    const a = addObject('m1', point())
    addObject('m1', { ...point(), links: [{ to: 'board', id: a }, { to: 'sidebar', id: 'n1' }] })
    removeObject('m1', a)
    const [rest] = getBoard('m1').objects
    expect(rest.links).toEqual([{ to: 'sidebar', id: 'n1' }])
    expect(getBoard('m1').objects).toHaveLength(1)
  })

  it('moves an object in the list', () => {
    const [a, b, c] = [addObject('m1', point()), addObject('m1', point()), addObject('m1', point())]
    moveObject('m1', a, 2)
    expect(getBoard('m1').objects.map((o) => o.id)).toEqual([b, c, a])
    moveObject('m1', a, -5)
    expect(getBoard('m1').objects.map((o) => o.id)).toEqual([a, b, c])
  })

  it('does not change an earlier board', () => {
    const id = addObject('m1', point())
    const before = getBoard('m1')
    const first = before.objects[0]
    updateObject('m1', id, { name: 'changed' })
    expect(before.objects[0]).toBe(first)
    expect(first.name).toBe('')
    expect(getBoard('m1')).not.toBe(before)
  })

  it('keeps the background layer for images', () => {
    expect(() => addObject('m1', { ...point(), layer: LAYER_BACKGROUND })).toThrow()
    const id = addObject('m1', point())
    expect(() => updateObject('m1', id, { layer: LAYER_BACKGROUND })).toThrow()
  })
})

describe('boardStore listeners', () => {
  it('are told once per change, and not after unsubscribing', () => {
    const listener = vi.fn()
    const stop = subscribeBoards(listener)
    const id = addObject('m1', point())
    updateObject('m1', id, { name: 'a' })
    moveObject('m1', id, 0)
    removeObject('m1', id)
    expect(listener).toHaveBeenCalledTimes(4)
    updateObject('m1', 999, { name: 'unknown id: no change' })
    expect(listener).toHaveBeenCalledTimes(4)
    stop()
    addObject('m1', point())
    expect(listener).toHaveBeenCalledTimes(4)
  })
})

describe('boardStore history', () => {
  it('undoes and redoes add, update, move and remove, giving back the very same boards', () => {
    const boards = [getBoard('m1')]
    const a = addObject('m1', point())
    boards.push(getBoard('m1'))
    const b = addObject('m1', point())
    boards.push(getBoard('m1'))
    updateObject('m1', a, { name: 'x' })
    boards.push(getBoard('m1'))
    moveObject('m1', a, 1)
    boards.push(getBoard('m1'))
    removeObject('m1', b)
    boards.push(getBoard('m1'))
    for (let i = boards.length - 2; i >= 0; i--) {
      undo('m1')
      expect(getBoard('m1')).toBe(boards[i])
    }
    expect(canUndo('m1')).toBe(false)
    for (let i = 1; i < boards.length; i++) {
      redo('m1')
      expect(getBoard('m1')).toBe(boards[i])
    }
    expect(canRedo('m1')).toBe(false)
  })

  it('ends the steps forward when something new is done', () => {
    addObject('m1', point())
    undo('m1')
    expect(canRedo('m1')).toBe(true)
    addObject('m1', point())
    expect(canRedo('m1')).toBe(false)
  })

  it('keeps ids unique after an undo (the next id goes back with the board)', () => {
    addObject('m1', point())
    undo('m1')
    expect(addObject('m1', point())).toBe(1)
  })

  it('remembers the last HISTORY_LIMIT steps', () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) addObject('m1', point())
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) undo('m1')
    expect(getBoard('m1').objects).toHaveLength(20)
  })

  it('does nothing, and tells nobody, with no steps to go', () => {
    const listener = vi.fn()
    subscribeBoards(listener)
    undo('m1')
    redo('m1')
    expect(listener).not.toHaveBeenCalled()
  })

  it('is kept apart per map and cleared by resetBoards', () => {
    addObject('m1', point())
    expect(canUndo('m2')).toBe(false)
    resetBoards()
    expect(canUndo('m1')).toBe(false)
  })
})

describe('changeObjects', () => {
  it('is one step for a change of several objects, and undo restores everything', () => {
    const a = addObject('m1', point())
    const b = addObject('m1', point(5))
    const before = getBoard('m1')
    const added = changeObjects('m1', { update: [{ id: a, patch: { name: 'a' } }], remove: [b], add: [point(9), point(10)] })
    expect(added).toEqual([3, 4])
    expect(getBoard('m1').objects.map((o) => o.id)).toEqual([a, 3, 4])
    undo('m1')
    expect(getBoard('m1')).toBe(before)
  })

  it('drops board-links to removed objects', () => {
    const a = addObject('m1', point())
    addObject('m1', { ...point(), links: [{ to: 'board', id: a }] })
    changeObjects('m1', { remove: [a] })
    expect(getBoard('m1').objects[0].links).toEqual([])
  })

  it('makes no step and tells nobody when nothing changes', () => {
    addObject('m1', point())
    const listener = vi.fn()
    subscribeBoards(listener)
    const steps = canUndo('m1')
    expect(changeObjects('m1', {})).toEqual([])
    changeObjects('m1', { remove: [99] })
    expect(listener).not.toHaveBeenCalled()
    expect(canUndo('m1')).toBe(steps)
  })

  it('keeps the background layer for images', () => {
    expect(() => changeObjects('m1', { add: [{ ...point(), layer: LAYER_BACKGROUND }] })).toThrow()
  })
})

describe('merging areas', () => {
  const square = (x: number, size: number) => [{ x, y: 0 }, { x: x + size, y: 0 }, { x: x + size, y: size }, { x, y: size }]
  const area = (x: number): Draft => ({ kind: 'border', name: '', links: [], style: DEFAULT_STYLE, fill: null, description: '', points: square(x, 100) })

  it('is one undo step however many areas it joins', () => {
    addObject('m1', area(0))
    addObject('m1', area(300))
    const before = getBoard('m1')
    const { change } = mergeBorders(before, { ...(area(50) as Omit<BorderObject, 'id'>), layer: LAYER_MAIN }, 2)
    changeObjects('m1', change)
    expect(getBoard('m1').objects).toHaveLength(2)
    undo('m1')
    expect(getBoard('m1')).toBe(before)
  })
})

describe('copyBoard and dropBoard', () => {
  it('copies a board with a fresh history, and edits do not leak', () => {
    const id = addObject('m1', point())
    copyBoard('m1', 'm2')
    expect(getBoard('m2').objects).toHaveLength(1)
    expect(canUndo('m2')).toBe(false)
    removeObject('m2', id)
    expect(getBoard('m1').objects).toHaveLength(1)
  })
  it('forgets a dropped board', () => {
    addObject('m1', point())
    dropBoard('m1')
    expect(getBoard('m1').objects).toHaveLength(0)
    expect(canUndo('m1')).toBe(false)
  })
})
