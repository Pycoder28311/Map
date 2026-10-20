import { describe, expect, it } from 'vitest'
import { resourceByName } from '../../resources/registry'
import { groupByRoot, rootResources, type Entry } from './tree'
import { RESOURCES } from '../../resources/registry'

const projects = resourceByName('projects')!
const folders = resourceByName('folders')!
const articles = resourceByName('articles')!
const maps = resourceByName('maps')!

const entry = (resource: typeof folders, id: number, parent?: [string, number]): Entry => ({
  resource,
  item: { id, objectType: parent?.[0] ?? null, objectId: parent?.[1] ?? null },
})
const roots = (ids: number[]) => [{ resource: projects, items: ids.map((id) => ({ id })) }]
const ids = (list: Entry[]) => list.map((e) => `${e.resource.name}:${e.item.id}`)

describe('rootResources', () => {
  it('are the resources that others point at and that have no parent: the projects', () => {
    expect(rootResources(RESOURCES).map((r) => r.name)).toEqual(['projects'])
  })
})

describe('groupByRoot', () => {
  it('puts the children of a project in its row, the rest in the orphans', () => {
    const list = [entry(articles, 1, ['project', 5]), entry(articles, 2), entry(folders, 3, ['project', 6]), entry(maps, 4)]
    const { byRoot, orphans } = groupByRoot(list, roots([5, 6, 7]))
    expect(ids(byRoot.get('projects:5')!)).toEqual(['articles:1'])
    expect(ids(byRoot.get('projects:6')!)).toEqual(['folders:3'])
    expect(byRoot.get('projects:7')).toEqual([])
    expect(ids(orphans)).toEqual(['articles:2', 'maps:4'])
  })

  it('keeps what is inside a folder in the project of that folder', () => {
    const list = [entry(folders, 1, ['project', 5]), entry(folders, 2, ['folder', 1]), entry(articles, 3, ['folder', 2])]
    const { byRoot, orphans } = groupByRoot(list, roots([5]))
    expect(ids(byRoot.get('projects:5')!)).toEqual(['folders:1', 'folders:2', 'articles:3'])
    expect(orphans).toEqual([])
  })

  it('makes an orphan of an item whose project is not live, or whose folder chain ends nowhere', () => {
    const list = [entry(articles, 1, ['project', 9]), entry(folders, 2), entry(articles, 3, ['folder', 2]), entry(articles, 4, ['folder', 99])]
    const { byRoot, orphans } = groupByRoot(list, roots([5]))
    expect(byRoot.get('projects:5')).toEqual([])
    expect(ids(orphans)).toEqual(['articles:1', 'folders:2', 'articles:3', 'articles:4'])
  })

  it('does not loop on a circular folder chain', () => {
    const list = [entry(folders, 1, ['folder', 2]), entry(folders, 2, ['folder', 1])]
    expect(ids(groupByRoot(list, roots([5])).orphans)).toEqual(['folders:1', 'folders:2'])
  })
})
