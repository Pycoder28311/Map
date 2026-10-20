import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS } from '../../mocks/projects'
import { choicesAt, eligibleFor, pathOf, resolveCreate } from './place'

const objects = SEED_OBJECTS
const byId = (id: string) => objects.find((o) => o.id === id)!
const ids = (list: { id: string }[]) => list.map((o) => o.id)

describe('pathOf', () => {
  it('lists the parents from the top, then the object', () => {
    expect(pathOf(objects, 'o1')).toEqual(['p2', 'o1'])
    expect(pathOf(objects, 'p2')).toEqual(['p2'])
    expect(pathOf(objects, 'o2')).toEqual(['o2'])
    expect(pathOf(objects, 'nope')).toEqual([])
  })
})

describe('eligibleFor', () => {
  it('creates where it can go', () => {
    expect(eligibleFor('object', byId('p1')).ok).toBe(true)
    expect(eligibleFor('object', null).ok).toBe(true)
    expect(eligibleFor('map', byId('p1')).ok).toBe(true)
  })

  it('says why not', () => {
    const map = eligibleFor('map', null)
    expect(!map.ok && map.why).toContain('project')
    const inMap = eligibleFor('object', byId('m3'))
    expect(!inMap.ok && inMap.why).toContain('a map')
    const mapInObject = eligibleFor('map', byId('o1'))
    expect(!mapInObject.ok && mapInObject.why).toContain('an object card')
  })
})

describe('choicesAt', () => {
  it('offers, at the top, the other projects', () => {
    expect(ids(choicesAt(objects, ['p2'], 0))).toEqual(['p1', 'p3'])
    expect(ids(choicesAt(objects, [], 0))).toEqual(['p1', 'p2', 'p3'])
  })

  it('has no projects inside a project: one level deeper offers nothing', () => {
    expect(choicesAt(objects, ['p2'], 1)).toEqual([])
  })

  it('has nothing inside a map or an object card', () => {
    expect(choicesAt(objects, ['p2', 'm3'], 2)).toEqual([])
  })
})

describe('resolveCreate', () => {
  it('creates inside the last part of the path, or at the top level', () => {
    expect(resolveCreate(['p2'])).toEqual({ parentId: 'p2' })
    expect(resolveCreate([])).toEqual({ parentId: null })
  })
})
