import { POINT_DEFAULT } from '../board/pointLabels'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addObject, getBoard, resetBoards, undo } from '../board/boardStore'
import { getLinkPick, isLinked, startLinkPick, stopLinkPick, subscribeLinkPick, toggleSidebarLink } from './linkPick'

const point = () => ({ kind: 'point' as const, name: '', links: [], anchor: { x: 0, y: 0 }, ...POINT_DEFAULT })

beforeEach(() => {
  resetBoards()
  stopLinkPick()
})

describe('linkPick', () => {
  it('starts, replaces the target for another object, and stops', () => {
    const listener = vi.fn()
    subscribeLinkPick(listener)
    startLinkPick({ mapId: 'm1', objectId: 1 })
    startLinkPick({ mapId: 'm1', objectId: 1 })
    expect(listener).toHaveBeenCalledTimes(1)
    startLinkPick({ mapId: 'm1', objectId: 2 })
    expect(getLinkPick()).toEqual({ mapId: 'm1', objectId: 2 })
    stopLinkPick()
    expect(getLinkPick()).toBeNull()
  })

  it('links, then unlinks, as undoable steps', () => {
    const id = addObject('m1', point())
    toggleSidebarLink('m1', id, 'n101')
    expect(isLinked('m1', id, 'n101')).toBe(true)
    toggleSidebarLink('m1', id, 'n102')
    expect(getBoard('m1').objects[0].links).toEqual([{ to: 'sidebar', id: 'n101' }, { to: 'sidebar', id: 'n102' }])
    toggleSidebarLink('m1', id, 'n101')
    expect(isLinked('m1', id, 'n101')).toBe(false)
    undo('m1')
    expect(isLinked('m1', id, 'n101')).toBe(true)
  })

  it('ignores an object that is gone', () => {
    toggleSidebarLink('m1', 99, 'n1')
    expect(getBoard('m1').objects).toEqual([])
  })
})
