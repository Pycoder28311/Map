// MOCK DATA tests: the store starts from the seed again before each one
import { beforeEach, describe, expect, it } from 'vitest'
import { findObject } from '../../mocks/projects'
import { getObjects, resetMockProjects } from '../../mocks/projectsStore'
import { createFromModal } from './createFromModal'

const fields = { title: '  Boots  ', description: ' A place ' }

beforeEach(resetMockProjects)

describe('createFromModal', () => {
  it('creates inside the place, first among its children, trimmed', () => {
    const card = createFromModal('object', ['p1'], fields)!
    expect(findObject(card.id)).toMatchObject({ kind: 'object', name: 'Boots', parentId: 'p1', description: 'A place' })
    expect(getObjects().filter((o) => o.parentId === 'p1')[0].id).toBe(card.id)
    expect(card.where).toBe('City parks')
  })

  it('makes a map in a project, and has no description for it', () => {
    const map = createFromModal('map', ['p2'], fields)!
    expect(findObject(map.id)).toMatchObject({ kind: 'map', parentId: 'p2' })
    expect(findObject(map.id)?.description).toBeUndefined()
  })

  it('makes an object card at the top level when there is no place', () => {
    const card = createFromModal('object', [], fields)!
    expect(findObject(card.id)?.parentId).toBeNull()
    expect(card.where).toBeNull()
  })

  it('refuses what cannot go there, and names an empty title Untitled', () => {
    expect(createFromModal('map', ['p2', 'm3'], fields)).toBeNull() // a map in a map
    expect(findObject(createFromModal('object', [], { ...fields, title: '  ' })!.id)?.name).toBe('Untitled')
  })
})
