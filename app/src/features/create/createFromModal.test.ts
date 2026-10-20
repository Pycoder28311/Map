// MOCK DATA tests: the store starts from the seed again before each one
import { beforeEach, describe, expect, it } from 'vitest'
import { findObject } from '../../mocks/projects'
import { getObjects, resetMockProjects } from '../../mocks/projectsStore'
import { createFromModal } from './createFromModal'

const fields = { title: '  Boots  ', description: ' A place ' }

beforeEach(resetMockProjects)

describe('createFromModal', () => {
  it('creates an object card first among the objects, trimmed', () => {
    const card = createFromModal('object', fields)
    expect(findObject(card.id)).toMatchObject({ kind: 'object', name: 'Boots', description: 'A place' })
    expect(getObjects()[0].id).toBe(card.id)
  })

  it('makes a map, and has no description for it', () => {
    const map = createFromModal('map', fields)
    expect(findObject(map.id)).toMatchObject({ kind: 'map', name: 'Boots' })
    expect(findObject(map.id)?.description).toBeUndefined()
  })

  it('names an empty title after the kind', () => {
    expect(findObject(createFromModal('object', { title: '  ', description: '' }).id)?.name).toBe('Untitled object card')
    expect(findObject(createFromModal('map', { title: '', description: '' }).id)?.name).toBe('Untitled map')
  })

  it('leaves the description out when it is empty', () => {
    expect(findObject(createFromModal('object', { title: 'x', description: '  ' }).id)?.description).toBeUndefined()
  })
})
