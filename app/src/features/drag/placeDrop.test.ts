import { comparePositions } from '@map/shared'
import { describe, expect, it } from 'vitest'
import type { Entry } from '../../lib/resource/reorder'
import { resourceByName } from '../../resources/registry'
import { resolvePlace, sideOf, type PlaceTarget } from './placeDrop'

const articles = resourceByName('articles')!
const folders = resourceByName('folders')!
const projects = resourceByName('projects')!
const notes = resourceByName('notes')!

const entry = (resource: typeof articles, id: number, position: string, extra: Record<string, unknown> = {}): Entry => ({
  resource,
  item: { id, position, pinned: false, objectType: null, objectId: null, ...extra },
})
const moved = (resource: typeof articles, id: number, pinned = false): Entry => ({ resource, item: { id, pinned } })
const project5 = { type: 'project', resource: 'projects', id: 5 }

// A project's row: an article and a folder of project 5
const a1 = entry(articles, 1, 'a0', { objectType: 'project', objectId: 5 })
const f2 = entry(folders, 2, 'a1', { objectType: 'project', objectId: 5 })
const row = (extra: Partial<PlaceTarget> = {}): PlaceTarget => ({ kind: 'card', rowId: 'projects:5', list: () => [a1, f2], parent: project5, ...extra })

describe('sideOf', () => {
  const rect = { left: 0, top: 0, width: 100, height: 40 }
  it('cards: left or right half; rows: the end; sidebar rows: top, middle (a parent) or bottom', () => {
    expect(sideOf({ kind: 'card' }, { x: 20, y: 0 }, rect)).toBe('before')
    expect(sideOf({ kind: 'card' }, { x: 80, y: 0 }, rect)).toBe('after')
    expect(sideOf({ kind: 'row' }, { x: 80, y: 0 }, rect)).toBe('end')
    const into = { parent: project5, list: () => [] }
    expect(sideOf({ kind: 'node', into }, { x: 0, y: 20 }, rect)).toBe('into')
    expect(sideOf({ kind: 'node' }, { x: 0, y: 19 }, rect)).toBe('before')
    expect(sideOf({ kind: 'node', into }, { x: 0, y: 35 }, rect)).toBe('after')
  })
})

describe('resolvePlace', () => {
  it('puts an item from its row after a card, writing a key between the neighbours and no parent', () => {
    const result = resolvePlace(row({ entry: f2 }), 'after', moved(articles, 1))!
    expect(comparePositions('a1', result.place.position)).toBeLessThan(0)
    expect(result.parent).toBeUndefined()
  })

  it('gives an item from another list the row\'s parent, in the same update', () => {
    const result = resolvePlace(row({ entry: a1 }), 'before', moved(articles, 9), { type: null, id: null })!
    expect(result.parent).toEqual(project5)
    expect(comparePositions(result.place.position, 'a0')).toBeLessThan(0)
  })

  it('does nothing where the item already is', () => {
    expect(resolvePlace(row({ entry: f2 }), 'before', moved(articles, 1))).toBeNull()
    expect(resolvePlace(row({ entry: a1 }), 'after', moved(articles, 1))).toBeNull()
    expect(resolvePlace(row({ kind: 'row' }), 'end', moved(folders, 2))).toBeNull()
  })

  it('refuses a parent the item cannot have, and itself', () => {
    expect(resolvePlace(row({ entry: a1 }), 'before', moved(projects, 3))).toBeNull()
    const intoFolder = { kind: 'node' as const, list: () => [], into: { parent: { type: 'folder', resource: 'folders', id: 2 }, list: () => [] } }
    expect(resolvePlace(intoFolder, 'into', moved(folders, 2))).toBeNull()
    expect(resolvePlace(intoFolder, 'into', moved(folders, 7))!.parent).toEqual({ type: 'folder', resource: 'folders', id: 2 })
  })

  it('keeps a sidebar section to its own resource, and its items\' parents', () => {
    const n1 = entry(notes, 1, 'a0', { objectType: 'project', objectId: 5 })
    const n2 = entry(notes, 2, 'a1')
    const section: PlaceTarget = { kind: 'node', entry: n2, list: () => [n1, n2], only: 'notes' }
    expect(resolvePlace(section, 'after', moved(articles, 4))).toBeNull()
    const result = resolvePlace(section, 'after', moved(notes, 8))!
    expect(result.parent).toBeUndefined()
    expect(comparePositions('a1', result.place.position)).toBeLessThan(0)
  })

  it('keeps pinned items among the pinned', () => {
    const pinned = entry(articles, 3, 'a0', { pinned: true, objectType: 'project', objectId: 5 })
    const target = row({ list: () => [pinned, a1, f2], entry: pinned })
    expect(resolvePlace(target, 'before', moved(articles, 9))).toBeNull()
    expect(resolvePlace(target, 'after', moved(articles, 9))).not.toBeNull()
  })
})
