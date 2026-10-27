import { describe, expect, it } from 'vitest'
import type { InfoRow } from '@map/shared'
import { changeKind, emptyRow, insertRow, moveRow, removeRow } from './infoRows'

const value = (id: string, v = ''): InfoRow => ({ id, label: id, kind: 'value', value: v })
const ids = (rows: InfoRow[]) => rows.map((r) => r.id)

describe('info rows', () => {
  it('makes an empty row of each kind', () => {
    expect(emptyRow('value', 'a')).toEqual({ id: 'a', label: '', kind: 'value', value: '' })
    expect(emptyRow('list', 'a')).toEqual({ id: 'a', label: '', kind: 'list', items: [''] })
    expect(emptyRow('text', 'a')).toEqual({ id: 'a', label: '', kind: 'text', text: '', bullets: false })
  })

  it('inserts, removes and moves rows', () => {
    const rows = [value('a'), value('b')]
    expect(ids(insertRow(rows, 1, value('x')))).toEqual(['a', 'x', 'b'])
    expect(ids(insertRow(rows, 9, value('x')))).toEqual(['a', 'b', 'x'])
    expect(ids(removeRow(rows, 'a'))).toEqual(['b'])
    expect(ids(moveRow(rows, 'b', -1))).toEqual(['b', 'a'])
    expect(moveRow(rows, 'a', -1)).toBe(rows)
    expect(moveRow(rows, 'b', 1)).toBe(rows)
  })

  it('changes kind keeping the label and the words', () => {
    const list: InfoRow = { id: 'l', label: 'Works', kind: 'list', items: ['One', '', 'Two'] }
    expect(changeKind(list, 'text')).toEqual({ id: 'l', label: 'Works', kind: 'text', text: 'One\nTwo', bullets: true })
    expect(changeKind(list, 'value')).toEqual({ id: 'l', label: 'Works', kind: 'value', value: 'One' })
    expect(changeKind(value('v', '1815'), 'list')).toEqual({ id: 'v', label: 'v', kind: 'list', items: ['1815'] })
    expect(changeKind(value('v'), 'list')).toEqual({ id: 'v', label: 'v', kind: 'list', items: [''] })
  })
})
