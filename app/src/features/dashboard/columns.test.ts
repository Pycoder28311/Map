import { describe, expect, it } from 'vitest'
import { columnLabel, menuEntries, moveColumn, pickColumn, sectionsBelow, validColumns, type ColumnId } from './columns'

const cols: ColumnId[] = ['recent', 'notes', 'maps']

describe('pickColumn', () => {
  it('swaps with the column already showing it', () => {
    expect(pickColumn(cols, 1, 'maps')).toEqual(['recent', 'maps', 'notes'])
  })
  it('replaces the column otherwise', () => {
    expect(pickColumn(cols, 0, 'project:p1')).toEqual(['project:p1', 'notes', 'maps'])
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
  it('lists Notes (when it is not a column), Orphans and the projects that are not columns', () => {
    expect(sectionsBelow(['recent', 'project:p2', 'maps'], ['p1', 'p2', 'p3'])).toEqual(['notes', 'orphans', 'project:p1', 'project:p3'])
    expect(sectionsBelow(['orphans', 'notes', 'maps'], ['p1'])).toEqual(['project:p1'])
  })
})

describe('validColumns', () => {
  it('uses the defaults for nothing or junk', () => {
    expect(validColumns(undefined, [])).toEqual(['recent', 'notes', 'maps'])
    expect(validColumns('x', [])).toEqual(['recent', 'notes', 'maps'])
  })
  it('keeps valid ones and fills gone or repeated ones with defaults not shown', () => {
    expect(validColumns(['project:p9', 'recent', 'recent'], ['p1'])).toEqual(['notes', 'recent', 'maps'])
    expect(validColumns(['maps', 'project:p1'], ['p1'])).toEqual(['maps', 'project:p1', 'recent'])
    expect(validColumns(['recent', 'notes', 'maps', 'projects'], [])).toEqual(['recent', 'notes', 'maps'])
  })
})

describe('menuEntries', () => {
  it('marks its own entry and the ones in other columns', () => {
    const entries = menuEntries(cols, 1, [{ id: 'p1', name: 'City parks' }])
    expect(entries.map((e) => e.id)).toEqual(['recent', 'notes', 'maps', 'projects', 'orphans', 'project:p1'])
    expect(entries.find((e) => e.id === 'notes')).toMatchObject({ current: true, inColumn: undefined })
    expect(entries.find((e) => e.id === 'maps')).toMatchObject({ current: false, inColumn: 3 })
    expect(entries.find((e) => e.id === 'project:p1')).toMatchObject({ label: 'City parks', current: false })
    expect(columnLabel('project:p1', [{ id: 'p1', name: 'City parks' }])).toBe('City parks')
  })
})
