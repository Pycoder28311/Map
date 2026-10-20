import { describe, expect, it } from 'vitest'
import { columnLabel, menuEntries, moveColumn, pickColumn, RESOURCE_COLUMNS, sectionsBelow, validColumns, type ColumnId } from './columns'

const cols: ColumnId[] = ['recent', 'notes', 'maps']

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
  it('lists Projects, Notes and Objects, minus the ones that are columns', () => {
    expect(sectionsBelow(['recent', 'notes', 'maps'])).toEqual(['projects', 'objects'])
    expect(sectionsBelow(['projects', 'notes', 'objects'])).toEqual([])
    expect(sectionsBelow(['recent', 'maps', 'objects'])).toEqual(['projects', 'notes'])
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
  it('drops what an older version stored (orphans, one column per project)', () => {
    expect(validColumns(['orphans', 'project:p1', 'maps'])).toEqual(['recent', 'notes', 'maps'])
  })
})

describe('menuEntries', () => {
  it('marks its own entry and the ones in other columns', () => {
    const entries = menuEntries(cols, 1)
    expect(entries.map((e) => e.id)).toEqual(['recent', 'notes', 'projects', 'maps', 'objects'])
    expect(entries.find((e) => e.id === 'notes')).toMatchObject({ current: true, inColumn: undefined })
    expect(entries.find((e) => e.id === 'maps')).toMatchObject({ current: false, inColumn: 3 })
    expect(columnLabel('projects')).toBe('Projects')
  })
})

describe('RESOURCE_COLUMNS', () => {
  it('names the columns that are the server\'s lists', () => {
    expect(RESOURCE_COLUMNS).toEqual({ projects: 'projects', notes: 'notes' })
  })
})
