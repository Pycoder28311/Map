import { describe, expect, it } from 'vitest'
import { resourcesWith } from '../../resources/registry'
import { columnLabel, DEFAULT_COLUMNS, menuEntries, moveColumn, pickColumn, sectionsBelow, validColumns, type ColumnId } from './columns'

const cols: ColumnId[] = ['recent', 'notes', 'maps']
const lists = resourcesWith('dashboard').map((r) => r.name)

describe('the lists', () => {
  it('are Recent and every resource with a Dashboard surface, in the UI config\'s order', () => {
    expect(menuEntries(cols, 0).map((e) => e.id)).toEqual(['recent', ...lists])
    expect(lists).toEqual(['projects', 'notes', 'folders', 'articles', 'objectCards', 'maps'])
    expect(DEFAULT_COLUMNS).toEqual(['recent', 'notes', 'maps'])
    expect(columnLabel('objectCards')).toBe('Object cards')
  })
})

describe('pickColumn', () => {
  it('swaps with the column already showing it', () => {
    expect(pickColumn(cols, 1, 'maps')).toEqual(['recent', 'maps', 'notes'])
  })
  it('replaces the column otherwise', () => {
    expect(pickColumn(cols, 0, 'projects')).toEqual(['projects', 'notes', 'maps'])
  })
  it('changes nothing for its own entry', () => {
    expect(pickColumn(cols, 2, 'maps')).toBe(cols)
  })
})

describe('moveColumn', () => {
  it('moves one column and shifts the others', () => {
    expect(moveColumn(cols, 0, 2)).toEqual(['notes', 'maps', 'recent'])
    expect(moveColumn(cols, 2, 0)).toEqual(['maps', 'recent', 'notes'])
    expect(moveColumn(cols, 1, 1)).toBe(cols)
  })
})

describe('sectionsBelow', () => {
  it('lists every resource that is not a column (Recent is only a column)', () => {
    expect(sectionsBelow(['recent', 'notes', 'maps'])).toEqual(['projects', 'folders', 'articles', 'objectCards'])
    expect(sectionsBelow(['projects', 'folders', 'articles'])).toEqual(['notes', 'objectCards', 'maps'])
  })
})

describe('validColumns', () => {
  it('uses the defaults for nothing or junk', () => {
    expect(validColumns(undefined)).toEqual(['recent', 'notes', 'maps'])
    expect(validColumns('x')).toEqual(['recent', 'notes', 'maps'])
  })
  it('keeps valid ones and fills unknown or repeated ones with defaults not shown', () => {
    expect(validColumns(['project:p9', 'recent', 'recent'])).toEqual(['notes', 'recent', 'maps'])
    expect(validColumns(['maps', 'projects'])).toEqual(['maps', 'projects', 'recent'])
    expect(validColumns(['recent', 'notes', 'maps', 'projects'])).toEqual(['recent', 'notes', 'maps'])
  })
  it('drops what an older version stored (orphans, objects)', () => {
    expect(validColumns(['orphans', 'objects', 'maps'])).toEqual(['recent', 'notes', 'maps'])
  })
})

describe('menuEntries', () => {
  it('marks its own entry and the ones in other columns', () => {
    const entries = menuEntries(cols, 1)
    expect(entries.find((e) => e.id === 'notes')).toMatchObject({ current: true, inColumn: undefined })
    expect(entries.find((e) => e.id === 'maps')).toMatchObject({ current: false, inColumn: 3 })
    expect(entries.find((e) => e.id === 'folders')).toMatchObject({ label: 'Folders', current: false, inColumn: undefined })
  })
})
