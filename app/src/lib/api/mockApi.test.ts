import { defineTables, field } from '@map/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { createMockApi, resetMocks } from './mockApi'

const { things } = defineTables({
  things: {
    access: 'owner',
    order: { pinned: true, position: true },
    fields: { title: field.text(50), content: field.richText() },
    preview: 'content',
    requireOneOf: ['title', 'content'],
    link: { types: { folder: 'things' } },
  },
})
const api = createMockApi(things, [{ title: 'a' }, { title: 'b', content: '<p>words</p>' }])
const ids = (items: { id: number }[]) => items.map((i) => i.id)

beforeEach(resetMocks)

describe('createMockApi', () => {
  it('starts from its seed, with the server\'s defaults', async () => {
    const page = await api.list({ archived: false })
    expect(ids(page.items)).toEqual([1, 2])
    expect(page.items[1]).toMatchObject({ title: 'b', preview: 'words', archived: false, pinned: false, position: 'a1', objectType: null, objectId: null })
    expect(page.items[1]).not.toHaveProperty('content')
    expect((await api.get(2)).content).toBe('<p>words</p>')
  })

  it('creates, updates and removes like the API, checking the contract', async () => {
    const made = await api.create({ title: '  c  ', pinned: true })
    expect(made).toMatchObject({ id: 3, title: 'c', pinned: true })
    await expect(api.create({})).rejects.toBeInstanceOf(ApiError)
    const changed = await api.update(3, { content: '<p>new</p><script>x</script>' })
    expect(changed).toMatchObject({ content: '<p>new</p>', preview: 'new' })
    await api.remove(3)
    await expect(api.get(3)).rejects.toMatchObject({ status: 404 })
  })

  it('lists in the server\'s order, filtered, a page at a time', async () => {
    await api.update(2, { pinned: true })
    await api.create({ title: 'c', objectType: 'folder', objectId: 4 })
    await api.update(1, { archived: true })
    expect(ids((await api.list({ archived: false })).items)).toEqual([2, 3])
    expect(ids((await api.list({ archived: true })).items)).toEqual([1])
    expect(ids((await api.list({ archived: false, objectType: 'none' })).items)).toEqual([2])
    const first = await api.list({ archived: false }, { limit: 1 })
    expect(ids(first.items)).toEqual([2])
    expect(ids((await api.list({ archived: false }, { limit: 1, cursor: first.nextCursor })).items)).toEqual([3])
  })

  it('goes back to its seed', async () => {
    await api.remove(1)
    resetMocks()
    expect(ids((await api.list({ archived: false })).items)).toEqual([1, 2])
  })
})
