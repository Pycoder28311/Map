import { getSchema } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { editorExtensions } from '../../../components/ui/editors/RichTextEditor'
import { articleExtensions } from '../../../components/ui/editors/articleExtensions'
import { clampSize, COLUMN_WIDTH, deleteColumn, deleteRow, insertColumn, insertRow, moveColumn, moveRow, reorder, setColumnWidths, setRowHeight } from './tableOps'

const schema = getSchema(editorExtensions({ extensions: articleExtensions }))
const cell = (type: 'tableHeader' | 'tableCell', text: string) => schema.nodes[type].create(null, schema.nodes.paragraph.create(null, text ? schema.text(text) : null))
const row = (type: 'tableHeader' | 'tableCell', ...texts: string[]) => schema.nodes.tableRow.create(null, texts.map((t) => cell(type, t)))
const table = schema.nodes.table.create(null, [row('tableHeader', 'A', 'B'), row('tableCell', 'a1', 'b1'), row('tableCell', 'a2', 'b2')])
const grid = (t: ReturnType<typeof table.copy>) => {
  const out: string[][] = []
  t.forEach((r) => {
    const cells: string[] = []
    r.forEach((c) => cells.push(`${c.type.name === 'tableHeader' ? 'H:' : ''}${c.textContent}`))
    out.push(cells)
  })
  return out
}

describe('reorder', () => {
  it('moves an item before another', () => {
    expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'a', 'c'])
    expect(reorder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(reorder(['a', 'b', 'c'], 0, 3)).toEqual(['b', 'c', 'a'])
    expect(reorder(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('table changes', () => {
  it('adds a body row and a column of the right kinds', () => {
    expect(grid(insertRow(table, 1))).toEqual([['H:A', 'H:B'], ['', ''], ['a1', 'b1'], ['a2', 'b2']])
    expect(grid(insertRow(table, 3))).toEqual([['H:A', 'H:B'], ['a1', 'b1'], ['a2', 'b2'], ['', '']])
    expect(grid(insertColumn(table, 1))).toEqual([['H:A', 'H:', 'H:B'], ['a1', '', 'b1'], ['a2', '', 'b2']])
    expect(grid(insertColumn(table, 2))).toEqual([['H:A', 'H:B', 'H:'], ['a1', 'b1', ''], ['a2', 'b2', '']])
  })
  it('takes rows and columns away; the last one takes the table', () => {
    expect(grid(deleteRow(table, 1)!)).toEqual([['H:A', 'H:B'], ['a2', 'b2']])
    expect(grid(deleteColumn(table, 0)!)).toEqual([['H:B'], ['b1'], ['b2']])
    expect(deleteColumn(deleteColumn(table, 0)!, 0)).toBeNull()
  })
  it('moves rows and columns', () => {
    expect(grid(moveRow(table, 2, 1))).toEqual([['H:A', 'H:B'], ['a2', 'b2'], ['a1', 'b1']])
    expect(grid(moveColumn(table, 0, 2))).toEqual([['H:B', 'H:A'], ['b1', 'a1'], ['b2', 'a2']])
  })
})

describe('table sizes', () => {
  it('gives every column its width, kept when columns move or are added', () => {
    const sized = setColumnWidths(table, [120, 200])
    const widths = (t: typeof table) => (t.firstChild ? [...Array(t.firstChild.childCount).keys()].map((i) => t.firstChild!.child(i).attrs.colwidth?.[0] ?? null) : [])
    expect(widths(sized)).toEqual([120, 200])
    expect(widths(moveColumn(sized, 0, 2))).toEqual([200, 120])
    // A new column takes the width of the column it is put before
    expect(widths(insertColumn(sized, 1))).toEqual([120, 200, 200])
  })
  it('gives a row its height and keeps the others', () => {
    const tall = setRowHeight(table, 1, 90)
    expect([0, 1, 2].map((i) => tall.child(i).attrs.height)).toEqual([null, 90, null])
  })
  it('keeps a size inside its limits', () => {
    expect(clampSize(5, COLUMN_WIDTH)).toBe(COLUMN_WIDTH.min)
    expect(clampSize(99999, COLUMN_WIDTH)).toBe(COLUMN_WIDTH.max)
    expect(clampSize(100.4, COLUMN_WIDTH)).toBe(100)
  })
  it('writes the sizes as the HTML attributes the server keeps', () => {
    const sized = setRowHeight(setColumnWidths(table, [120, 200]), 1, 90)
    const spec = (node: typeof sized) => node.type.spec.toDOM?.(node)
    expect(spec(sized.child(1) as typeof sized)).toEqual(['tr', { style: 'height: 90px' }, 0])
    expect(spec(sized.child(0) as typeof sized)).toEqual(['tr', {}, 0])
    expect(spec(sized.child(1).child(0) as typeof sized)).toMatchObject(['td', { colwidth: [120] }, 0])
  })
})
