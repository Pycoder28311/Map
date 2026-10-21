import { describe, expect, expectTypeOf, it } from 'vitest'
import { DATA, TABLE_NAMES, type Filter, type Input, type Item, type ListItem } from './data.config'
import { field } from './fields'
import { defineTables, kebabCase, matchesFilter, snakeCase } from './table'

describe('field kinds', () => {
  it('trims and limits a text field', () => {
    expect(field.text(5).zod.parse('  abc  ')).toBe('abc')
    expect(field.text(5).zod.safeParse('abcdef').success).toBe(false)
  })
  it('keeps the lines of a plain text field', () => {
    expect(field.plainText(20).zod.parse(' a\nb ')).toBe(' a\nb ')
    expect(field.plainText(3).zod.safeParse('abcd').success).toBe(false)
  })
  it('cleans a rich text field', () => {
    expect(field.richText().zod.parse('<p onclick="x()">hi</p><script>x</script>')).toBe('<p>hi</p>')
  })
  it('limits numbers and takes booleans', () => {
    expect(field.int({ min: 1, max: 3 }).zod.safeParse(4).success).toBe(false)
    expect(field.int({ min: 1, max: 3 }).default).toBe(1)
    expect(field.bool().zod.parse(true)).toBe(true)
  })
})

describe('names', () => {
  it('derives the database and API names from the config key', () => {
    expect(snakeCase('objectCards')).toBe('object_cards')
    expect(kebabCase('objectCards')).toBe('object-cards')
    expect(DATA.objectCards).toMatchObject({ name: 'objectCards', tableName: 'object_cards', path: 'object-cards' })
    expect(TABLE_NAMES).toEqual(['projects', 'notes', 'folders', 'articles', 'objectCards'])
  })
  it('filters by parent where the table has a link, unless it says otherwise', () => {
    expect(DATA.folders.listFilters).toEqual(['archived', 'link'])
    expect(DATA.projects.listFilters).toEqual(['archived'])
    expect(DATA.notes.listFilters).toEqual(['archived', 'link'])
  })
})

describe('input', () => {
  it('needs one of requireOneOf', () => {
    expect(DATA.notes.input.safeParse({}).success).toBe(false)
    expect(DATA.notes.input.safeParse({ title: '  ' }).success).toBe(false)
    expect(DATA.notes.input.safeParse({ title: 'x' }).success).toBe(true)
    expect(DATA.folders.input.safeParse({ description: 'only text' }).success).toBe(false)
  })
  it('keeps only known fields and cleans rich text', () => {
    const parsed = DATA.articles.input.parse({ title: 't', content: '<p>a</p><script>x</script>', userId: 'me', preview: 'x', id: 3 })
    expect(parsed).toEqual({ title: 't', content: '<p>a</p>' })
  })
  it('takes the order fields and archived', () => {
    expect(DATA.projects.input.parse({ title: 't', pinned: true, position: 'a5', archived: false })).toEqual({ title: 't', pinned: true, position: 'a5', archived: false })
    expect(DATA.projects.input.safeParse({ title: 't', position: 5 }).success).toBe(false)
    expect(DATA.projects.input.safeParse({ title: 't', position: 'not a key' }).success).toBe(false)
  })
  it('takes a parent only as a pair of a known table and an id', () => {
    expect(DATA.folders.input.safeParse({ title: 't', objectType: 'project', objectId: 1 }).success).toBe(true)
    expect(DATA.folders.input.safeParse({ title: 't', objectType: null, objectId: null }).success).toBe(true)
    expect(DATA.folders.input.safeParse({ title: 't', objectType: 'project' }).success).toBe(false)
    expect(DATA.folders.input.safeParse({ title: 't', objectType: 'project', objectId: null }).success).toBe(false)
    expect(DATA.folders.input.safeParse({ title: 't', objectType: 'note', objectId: 1 }).success).toBe(false)
    // A table without a link drops the fields
    expect(DATA.projects.input.parse({ title: 't', objectType: 'project', objectId: 1 })).toEqual({ title: 't' })
  })
  it('lets an update change any field, the pair together', () => {
    expect(DATA.notes.update.safeParse({}).success).toBe(true)
    expect(DATA.notes.update.safeParse({ title: '' }).success).toBe(true)
    expect(DATA.notes.update.safeParse({ objectId: 4 }).success).toBe(false)
  })
})

describe('filter', () => {
  it('lists the live items by default, the Trash on request', () => {
    expect(DATA.projects.filter.parse({})).toEqual({ archived: false })
    expect(DATA.projects.filter.parse({ archived: 'true' })).toEqual({ archived: true })
  })
  it('filters a linked table by parent, or by having none', () => {
    expect(DATA.folders.filter.parse({ objectType: 'none' })).toEqual({ archived: false, objectType: 'none' })
    expect(DATA.folders.filter.parse({ objectType: 'project', objectId: '5' })).toEqual({ archived: false, objectType: 'project', objectId: 5 })
    expect(DATA.folders.filter.safeParse({ objectId: '5' }).success).toBe(false)
    expect(DATA.folders.filter.safeParse({ objectType: 'none', objectId: '5' }).success).toBe(false)
    expect(DATA.folders.filter.safeParse({ objectType: 'note' }).success).toBe(false)
  })
})

describe('matchesFilter', () => {
  const item = { archived: false, objectType: null, objectId: null }
  it('matches every given value; none = no parent', () => {
    expect(matchesFilter({ archived: false }, item)).toBe(true)
    expect(matchesFilter({ archived: true }, item)).toBe(false)
    expect(matchesFilter({ archived: false, objectType: 'none' }, item)).toBe(true)
    expect(matchesFilter({ archived: false, objectType: 'none' }, { ...item, objectType: 'folder', objectId: 2 })).toBe(false)
    expect(matchesFilter({ objectType: 'folder', objectId: 2 }, { ...item, objectType: 'folder', objectId: 2 })).toBe(true)
    expect(matchesFilter({ objectType: undefined }, item)).toBe(true)
  })
})

describe('types', () => {
  it('derives each table\'s item, list item, input and filter', () => {
    expectTypeOf<Item<'folders'>>().toMatchTypeOf<{ id: number; title: string; description: string; pinned: boolean; position: string; objectType: 'project' | 'folder' | null }>()
    expectTypeOf<Item<'folders'>>().not.toHaveProperty('preview')
    expectTypeOf<Item<'articles'>>().toHaveProperty('content')
    expectTypeOf<ListItem<'articles'>>().not.toHaveProperty('content')
    expectTypeOf<ListItem<'articles'>>().toHaveProperty('preview')
    expectTypeOf<Item<'projects'>>().not.toHaveProperty('objectType')
    expectTypeOf<Input<'notes'>>().toMatchTypeOf<{ title?: string; objectId?: number | null }>()
    expectTypeOf<Filter<'folders'>>().toMatchTypeOf<{ archived: boolean; objectType?: 'project' | 'folder' | 'none' }>()
  })
  it('works for any config', () => {
    const tables = defineTables({ tags: { access: 'owner', order: { pinned: false, position: false }, fields: { name: field.text(20) } } })
    expect(tables.tags.input.parse({ name: 'x' })).toEqual({ name: 'x' })
  })
})
