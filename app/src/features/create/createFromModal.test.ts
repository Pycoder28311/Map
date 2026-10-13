// MOCK DATA tests: the store starts from the seed again before each one
import { beforeEach, describe, expect, it } from 'vitest'
import { findObject } from '../../mocks/projects'
import { getObjects, linksOf, resetMockProjects } from '../../mocks/projectsStore'
import { createFromModal } from './createFromModal'

const fields = { title: '  Boots  ', text: ' Stiff soles ', description: ' A place ' }

beforeEach(resetMockProjects)

describe('createFromModal', () => {
  it('makes a note at the top level, linked to the place, trimmed', () => {
    const made = createFromModal('note', ['p2', 'f1'], fields)!
    expect(findObject(made.id)).toMatchObject({ kind: 'note', name: 'Boots', text: 'Stiff soles', parentId: null })
    expect(linksOf('f1').map((o) => o.id)).toContain(made.id)
    expect(made.where).toBe('Guides')
  })

  it('makes a note with no link when there is no place', () => {
    const made = createFromModal('note', [], fields)!
    expect(linksOf(made.id)).toEqual([])
    expect(made.where).toBeNull()
  })

  it('creates the other kinds inside the place, first among its children', () => {
    const article = createFromModal('article', ['p2', 'f1'], fields)!
    expect(findObject(article.id)).toMatchObject({ kind: 'article', parentId: 'f1', text: 'Stiff soles' })
    expect(getObjects().filter((o) => o.parentId === 'f1')[0].id).toBe(article.id)

    const card = createFromModal('object', ['p1'], fields)!
    expect(findObject(card.id)).toMatchObject({ kind: 'object', parentId: 'p1', description: 'A place' })
    expect(findObject(card.id)?.text).toBeUndefined()
    expect(getObjects().filter((o) => o.parentId === 'p1')[0].id).toBe(card.id)
  })

  it('refuses what cannot go there, and names an empty title Untitled', () => {
    expect(createFromModal('folder', ['p2', 'f1'], fields)).toBeNull() // a folder in a folder
    expect(findObject(createFromModal('folder', [], { ...fields, title: '  ' })!.id)?.name).toBe('Untitled')
  })
})
