// Changes to a table of the article's text (TableTools.tsx): a row or a column added, taken away, moved or resized. Each takes the table node and answers
// the new one (null: nothing left of it). Columns are counted by cells (the article's tables have no merged cells). Pure (tableOps.test.ts).
import { Fragment, type Node as PMNode } from '@tiptap/pm/model'

/** `list` with the item at `from` placed before the item that was at `to` (0…length; `to` past the end: last) */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list]
  const next = list.filter((_, i) => i !== from)
  const at = Math.max(0, Math.min(next.length, to > from ? to - 1 : to))
  next.splice(at, 0, list[from])
  return next
}

const children = (node: PMNode) => {
  const out: PMNode[] = []
  node.forEach((child) => out.push(child))
  return out
}

/** An empty cell of the same kind as `like` (a header cell stays a header cell) */
const emptyLike = (like: PMNode) => like.type.createAndFill(like.attrs) ?? like.type.create(like.attrs)

/** A new empty row before row `at` (at the end: after the last), its cells of the kinds of the row it is next to */
export function insertRow(table: PMNode, at: number): PMNode {
  const rows = children(table)
  const like = rows[Math.min(at, rows.length - 1)]
  if (!like) return table
  // Next to the header row from below: a body row (the kinds of the row under it, or plain cells)
  const model = at > 0 && at <= rows.length - 1 ? rows[at] : at === rows.length ? rows[rows.length - 1] : like
  const row = model.type.create(model.attrs, Fragment.from(children(model).map(emptyLike)))
  rows.splice(Math.max(0, Math.min(rows.length, at)), 0, row)
  return table.type.create(table.attrs, Fragment.from(rows))
}

/** A new empty column before column `at` (at the end: after the last), each new cell of the kind of its neighbour in its row */
export function insertColumn(table: PMNode, at: number): PMNode {
  const rows = children(table).map((row) => {
    const cells = children(row)
    const like = cells[Math.min(at, cells.length - 1)]
    if (!like) return row
    cells.splice(Math.max(0, Math.min(cells.length, at)), 0, emptyLike(like))
    return row.type.create(row.attrs, Fragment.from(cells))
  })
  return table.type.create(table.attrs, Fragment.from(rows))
}

/** Row `index` taken away (null: it was the last one) */
export function deleteRow(table: PMNode, index: number): PMNode | null {
  const rows = children(table).filter((_, i) => i !== index)
  return rows.length ? table.type.create(table.attrs, Fragment.from(rows)) : null
}

/** Column `index` taken away (null: it was the last one) */
export function deleteColumn(table: PMNode, index: number): PMNode | null {
  const rows = children(table).map((row) => children(row).filter((_, i) => i !== index))
  if (rows.every((cells) => cells.length === 0)) return null
  return table.type.create(table.attrs, Fragment.from(children(table).map((row, i) => row.type.create(row.attrs, Fragment.from(rows[i])))))
}

/** Row `from` moved before row `to` */
export function moveRow(table: PMNode, from: number, to: number): PMNode {
  return table.type.create(table.attrs, Fragment.from(reorder(children(table), from, to)))
}

/** Column `from` moved before column `to`, in every row */
export function moveColumn(table: PMNode, from: number, to: number): PMNode {
  const rows = children(table).map((row) => row.type.create(row.attrs, Fragment.from(reorder(children(row), from, to))))
  return table.type.create(table.attrs, Fragment.from(rows))
}

/** The least and most a column's width and a row's height can be dragged to (px) */
export const COLUMN_WIDTH = { min: 40, max: 1200 }
export const ROW_HEIGHT = { min: 28, max: 800 }
export const clampSize = (px: number, { min, max }: { min: number; max: number }) => Math.round(Math.max(min, Math.min(max, px)))

/** Every column given its width in px (`widths[i]` for column i: all together, so the table is as wide as they add up to) */
export function setColumnWidths(table: PMNode, widths: readonly number[]): PMNode {
  const rows = children(table).map((row) => {
    const cells = children(row).map((cell, i) => (widths[i] ? cell.type.create({ ...cell.attrs, colwidth: [clampSize(widths[i], COLUMN_WIDTH)] }, cell.content, cell.marks) : cell))
    return row.type.create(row.attrs, Fragment.from(cells))
  })
  return table.type.create(table.attrs, Fragment.from(rows))
}

/** Row `index` given its height in px (a row is at least as tall as its words) */
export function setRowHeight(table: PMNode, index: number, px: number): PMNode {
  const rows = children(table).map((row, i) => (i === index ? row.type.create({ ...row.attrs, height: clampSize(px, ROW_HEIGHT) }, row.content, row.marks) : row))
  return table.type.create(table.attrs, Fragment.from(rows))
}
