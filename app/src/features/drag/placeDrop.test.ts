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

  it('a card that can be a parent (a folder): its middle is into it, its sides before and after', () => {
    const into = { parent: project5, list: () => [] }
    expect(sideOf({ kind: 'card', into }, { x: 50, y: 0 }, rect)).toBe('into')
    expect(sideOf({ kind: 'card', into }, { x: 10, y: 0 }, rect)).toBe('before')
    expect(sideOf({ kind: 'card', into }, { x: 90, y: 0 }, rect)).toBe('after')
  })
})

describe('resolvePlace', () => {
  it('puts an item from its row after a card, writing a key between the neighbours and no parent', () => {
    const result = resolvePlace(row({ entry: f2 }), 'after', moved(articles, 1))!
    expect(comparePositions('a1', result.place.position!)).toBeLessThan(0)
    expect(result.parent).toBeUndefined()
  })

  it('gives an item from another list the row\'s parent, in the same update', () => {
    const result = resolvePlace(row({ entry: a1 }), 'before', moved(articles, 9), { type: null, id: null })!
    expect(result.parent).toEqual(project5)
    expect(comparePositions(result.place.position!, 'a0')).toBeLessThan(0)
  })

  it('does nothing where the item already is', () => {
    expect(resolvePlace(row({ entry: f2 }), 'before', moved(articles, 1))).toBeNull()
    expect(resolvePlace(row({ entry: a1 }), 'after', moved(articles, 1))).toBeNull()
    expect(resolvePlace(row({ kind: 'row' }), 'end', moved(folders, 2))).toBeNull()
  })

  it('puts an item dropped into an open parent first among its children, and into a closed one last', () => {
    const intoProject: PlaceTarget = { kind: 'node', list: () => [], into: { parent: project5, list: () => [a1, f2] } }
    const last = resolvePlace(intoProject, 'into', moved(notes, 8))!
    expect(comparePositions('a1', last.place.position!)).toBeLessThan(0)
    const first = resolvePlace(intoProject, 'into', moved(notes, 8), undefined, true)!
    expect(comparePositions(first.place.position!, 'a0')).toBeLessThan(0)
    expect(first.parent).toEqual(project5)
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
    expect(comparePositions('a1', result.place.position!)).toBeLessThan(0)
  })

  it('takes another resource inside a project row of a section, wherever on the row it is dropped', () => {
    const project: PlaceTarget = {
      kind: 'node',
      entry: entry(projects, 5, 'a0'),
      list: () => [entry(projects, 5, 'a0')],
      only: 'projects',
      into: { parent: project5, list: () => [a1, f2] },
    }
    for (const side of ['before', 'after', 'into'] as const) {
      const result = resolvePlace(project, side, moved(notes, 8), { type: null, id: null })!
      expect(result.side).toBe('into')
      expect(result.parent).toEqual(project5)
    }
    // Without somewhere to go inside, it still takes no other resource
    expect(resolvePlace({ ...project, into: undefined }, 'before', moved(notes, 8))).toBeNull()
  })

  it('takes an item out of its parent when it is let go by the edge of a project row (between two parents), not by its middle', () => {
    const project: PlaceTarget = {
      kind: 'node',
      entry: entry(projects, 5, 'a0'),
      list: () => [entry(projects, 5, 'a0')],
      only: 'projects',
      into: { parent: project5, list: () => [a1, f2] },
    }
    const inProject5 = { type: 'project', id: 5 }
    for (const side of ['before', 'after'] as const) {
      const result = resolvePlace(project, side, moved(notes, 8), inProject5)!
      // Only the parent changes: the item keeps its place
      expect(result).toMatchObject({ side: 'out', edge: side, parent: null, place: { fixes: [] } })
      expect(result.place.position).toBeUndefined()
    }
    // The middle of another project's row puts it inside that one; the middle of its own does nothing
    expect(resolvePlace(project, 'into', moved(notes, 8), { type: 'project', id: 9 })!.parent).toEqual(project5)
    const withIt = { ...project, into: { parent: project5, list: () => [a1, f2, entry(notes, 8, 'a2', { objectType: 'project', objectId: 5 })] } }
    expect(resolvePlace(withIt, 'into', moved(notes, 8), inProject5)).toBeNull()
    // An item with no parent has nothing to leave: the edge puts it inside, like the middle
    expect(resolvePlace(project, 'before', moved(notes, 8), { type: null, id: null })!.side).toBe('into')
  })

  it('puts an item out of its project exactly where it is let go among the projects and orphans of the sidebar', () => {
    const p1 = entry(projects, 1, 'a0')
    const p2 = entry(projects, 2, 'a2')
    const orphan = entry(articles, 7, 'a1')
    const top = [p1, orphan, p2]
    const accepts = ['projects', 'articles', 'folders']
    const row = (e: Entry): PlaceTarget => ({ kind: 'node', entry: e, list: () => top, parent: null, accepts, into: { parent: { type: 'project', resource: 'projects', id: e.item.id }, list: () => [] } })
    const inProject5 = { type: 'project', id: 5 }
    // Let go by the top edge of the second project: between the orphan and it, with no parent
    const result = resolvePlace(row(p2), 'before', moved(articles, 9), inProject5)!
    expect(result.parent).toBeNull()
    expect(comparePositions('a1', result.place.position!)).toBeLessThan(0)
    expect(comparePositions(result.place.position!, 'a2')).toBeLessThan(0)
    // An orphan already in the list is only moved (its parent stays none); a project is placed among them too
    expect(resolvePlace(row(p1), 'after', moved(articles, 7), { type: null, id: null })).toBeNull()
    expect(resolvePlace(row(p2), 'before', moved(articles, 7), { type: null, id: null })).toBeNull()
    const project = resolvePlace(row(orphan), 'after', moved(projects, 1))!
    expect(project.parent).toBeUndefined()
    expect(comparePositions('a1', project.place.position!)).toBeLessThan(0)
    // The middle of a project row still puts it inside
    expect(resolvePlace(row(p2), 'into', moved(articles, 9), inProject5)!.parent).toEqual({ type: 'project', resource: 'projects', id: 2 })
    // A note has a section of its own: not among them
    expect(resolvePlace(row(p2), 'before', moved(notes, 8), inProject5)!.side).toBe('out')
  })

  it('keeps pinned items among the pinned', () => {
    const pinned = entry(articles, 3, 'a0', { pinned: true, objectType: 'project', objectId: 5 })
    const target = row({ list: () => [pinned, a1, f2], entry: pinned })
    expect(resolvePlace(target, 'before', moved(articles, 9))).toBeNull()
    expect(resolvePlace(target, 'after', moved(articles, 9))).not.toBeNull()
  })
})
