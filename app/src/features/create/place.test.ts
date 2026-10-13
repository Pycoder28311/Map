import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS } from '../../mocks/projects'
import { choicesAt, eligibleFor, pathOf, resolveCreate } from './place'

const objects = SEED_OBJECTS
const byId = (id: string) => objects.find((o) => o.id === id)!
const ids = (list: { id: string }[]) => list.map((o) => o.id)

describe('pathOf', () => {
  it('lists the parents from the top, then the object', () => {
    expect(pathOf(objects, 'a1')).toEqual(['p2', 'f1', 'a1'])
    expect(pathOf(objects, 'f1')).toEqual(['p2', 'f1'])
    expect(pathOf(objects, 'n1')).toEqual(['n1'])
    expect(pathOf(objects, 'nope')).toEqual([])
  })
})

describe('eligibleFor', () => {
  it('links a note to link targets or nothing', () => {
    expect(eligibleFor('note', null).ok).toBe(true)
    expect(eligibleFor('note', byId('f1')).ok).toBe(true)
    expect(eligibleFor('note', byId('m3')).ok).toBe(true)
    const no = eligibleFor('note', byId('a1'))
    expect(no.ok).toBe(false)
    expect(!no.ok && no.why).toBe("A note can't be linked to an article")
  })

  it('creates the others where they can go', () => {
    expect(eligibleFor('article', byId('f1')).ok).toBe(true)
    expect(eligibleFor('article', byId('p1')).ok).toBe(true)
    expect(eligibleFor('article', null).ok).toBe(true)
    expect(eligibleFor('object', byId('p1')).ok).toBe(true)
    expect(eligibleFor('object', null).ok).toBe(true)
    expect(eligibleFor('folder', byId('p1')).ok).toBe(true)
    expect(eligibleFor('map', byId('p1')).ok).toBe(true)
  })

  it('says why not', () => {
    const map = eligibleFor('map', null)
    expect(!map.ok && map.why).toContain('project')
    const inFolder = eligibleFor('object', byId('f1'))
    expect(!inFolder.ok && inFolder.why).toBe('A folder only holds articles')
    expect(eligibleFor('folder', byId('f1')).ok).toBe(false)
    expect(eligibleFor('map', byId('f1')).ok).toBe(false)
    const inMap = eligibleFor('article', byId('m3'))
    expect(!inMap.ok && inMap.why).toContain('a map')
  })
})

describe('choicesAt', () => {
  it('offers, at the top, the other projects (and for a note, link targets and folders there)', () => {
    expect(ids(choicesAt(objects, ['p2'], 0, 'note'))).toEqual(['p1', 'p3', 'o2'])
    expect(ids(choicesAt(objects, ['p2'], 0, 'article'))).toEqual(['p1', 'p3'])
    expect(ids(choicesAt(objects, [], 0, 'article'))).toEqual(['p1', 'p2', 'p3'])
  })

  it('offers what is inside the part before it, without the current one', () => {
    expect(ids(choicesAt(objects, ['p2', 'f1'], 1, 'note'))).toEqual(['m3', 'm4', 'o1'])
    expect(ids(choicesAt(objects, ['p2', 'f1'], 1, 'article'))).toEqual([])
    // One level deeper than the path
    expect(ids(choicesAt(objects, ['p2'], 1, 'article'))).toEqual(['f1'])
    expect(ids(choicesAt(objects, ['p2'], 1, 'note'))).toEqual(['m3', 'm4', 'o1', 'f1'])
  })

  it('has nothing inside a map or an object card', () => {
    expect(choicesAt(objects, ['p2', 'm3'], 2, 'note')).toEqual([])
  })
})

describe('resolveCreate', () => {
  it('links a note and creates the others inside', () => {
    expect(resolveCreate('note', ['p2', 'f1'])).toEqual({ parentId: null, linkTo: 'f1' })
    expect(resolveCreate('note', [])).toEqual({ parentId: null, linkTo: null })
    expect(resolveCreate('article', ['p2', 'f1'])).toEqual({ parentId: 'f1', linkTo: null })
    expect(resolveCreate('folder', [])).toEqual({ parentId: null, linkTo: null })
  })
})
