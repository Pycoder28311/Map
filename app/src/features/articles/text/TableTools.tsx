import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { LuGripHorizontal, LuGripVertical, LuMinus, LuPlus } from 'react-icons/lu'
import type { ArticleText } from './articleText'
import { deleteColumn, deleteRow, insertColumn, insertRow, moveColumn, moveRow } from './tableOps'
import { keepFocus } from '../../../lib/keepFocus'

/** How near a grid line the pointer must be for it to light up (px) */
const NEAR = 6
/** How far outside the table the pointer can go and its tools stay (they are out there) */
const KEEP = 64
/** How long the pointer stays on another row or column before the tools go to it (ms): on its way out to them it crosses others */
const SWITCH_MS = 220
/** The tools' distance from the table's edge (px) */
const OUT = 14

/** The table under the pointer, its row and column there (-1: none yet), the edge of each nearest to the pointer, and the grid line it is on (if any) */
type Hover = { table: HTMLTableElement; row: number; col: number; colEdge: number; rowEdge: number; line: { kind: 'col' | 'row'; at: number } | null }
type Drag = { kind: 'col' | 'row'; from: number; to: number }

/** The table's grid lines in screen px: its columns' edges (from its first row) and its rows' edges */
function gridOf(table: HTMLTableElement) {
  const rows = [...table.rows]
  const first = rows[0] ? [...rows[0].cells].map((c) => c.getBoundingClientRect()) : []
  const xs = first.length ? [first[0].left, ...first.map((r) => r.right)] : []
  const rr = rows.map((r) => r.getBoundingClientRect())
  const ys = rr.length ? [rr[0].top, ...rr.map((r) => r.bottom)] : []
  return { rows, xs, ys, rect: table.getBoundingClientRect() }
}

const nearest = (lines: number[], at: number) => lines.reduce((best, line, i) => (Math.abs(line - at) < Math.abs(lines[best] - at) ? i : best), 0)

/** A small square button of the tools */
function Tool({ label, onClick, onPointerDown, children, grab }: { label: string; onClick?: () => void; onPointerDown?: (e: ReactPointerEvent) => void; children: ReactNode; grab?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={keepFocus}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`flex size-4 items-center justify-center rounded-[3px] text-fg-muted hover:bg-fill-strong hover:text-fg ${grab ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

/**
 * The tools of a table of the text, on an editor's page, while the pointer is over it:
 * - one + for the column under the pointer, above the table at the column's edge nearer to the pointer, and one for its row, at the table's left
 *   at the row's nearer edge: it adds a column or a row
 *   there; the line lights up along the whole table while the + or the line itself is under the pointer (a click on the line adds too);
 * - above the column under the pointer, and at the left of its row: a ⠿ to drag the column (or row) to another place (a line shows where it
 *   goes) and a − to take it away.
 * The changes are made on the whole text, so a table that is not open for editing changes as it is. `box`: the element around the text (positioned)
 */
export default function TableTools({ text, box }: { text: ArticleText; box: RefObject<HTMLElement | null> }) {
  const [hover, setHover] = useState<Hover | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  // The + under the pointer lights its line
  const [lit, setLit] = useState<{ kind: 'col' | 'row'; at: number } | null>(null)
  // A move to another row or column, waiting (SWITCH_MS)
  const pending = useRef<number | undefined>(undefined)
  const shown = useRef<Hover | null>(null)
  shown.current = hover

  useEffect(() => {
    // On the whole page, not only over the text: the tools are outside the table (and outside the text's box), the pointer goes out to them
    const move = (e: PointerEvent) => {
      const el = box.current
      if (!el || e.buttons || drag) return
      const target = e.target as Element | null
      if (target?.closest?.('[data-table-tools]')) {
        window.clearTimeout(pending.current)
        return
      }
      const table = target?.closest?.('table')
      if (!(table instanceof HTMLTableElement) || !el.contains(table)) {
        // Off the table: the tools stay while the pointer is near it (on its way to them)
        setHover((old) => {
          if (!old) return old
          const r = old.table.getBoundingClientRect()
          const near = e.clientX > r.left - KEEP && e.clientX < r.right + KEEP && e.clientY > r.top - KEEP && e.clientY < r.bottom + KEEP
          return near && old.table.isConnected ? (old.line ? { ...old, line: null } : old) : null
        })
        return
      }
      const cell = target?.closest?.('td, th') as HTMLTableCellElement | null
      const { xs, ys } = gridOf(table)
      const col = xs.length ? nearest(xs, e.clientX) : -1
      const row = ys.length ? nearest(ys, e.clientY) : -1
      const dx = col < 0 ? Infinity : Math.abs(xs[col] - e.clientX)
      const dy = row < 0 ? Infinity : Math.abs(ys[row] - e.clientY)
      const line = Math.min(dx, dy) > NEAR ? null : dx <= dy ? { kind: 'col' as const, at: col } : { kind: 'row' as const, at: row }
      const old = shown.current
      const r = cell ? (cell.parentElement as HTMLTableRowElement).rowIndex : old?.table === table ? old.row : -1
      const c = cell ? cell.cellIndex : old?.table === table ? old.col : -1
      // Another row or column of a table whose tools show: they go to it only once the pointer has stayed there a moment
      const elsewhere = old && old.table === table && (old.row !== r || old.col !== c)
      window.clearTimeout(pending.current)
      if (elsewhere) {
        pending.current = window.setTimeout(() => apply(r, c), SWITCH_MS)
        return
      }
      apply(r, c)
      function apply(r: number, c: number) {
      setHover((old) => {
        // The hovered column's edge (left or right) and row's edge (top or bottom) nearer to the pointer: where their + is
        const colEdge = c < 0 ? -1 : Math.abs(xs[c] - e.clientX) <= Math.abs(xs[c + 1] - e.clientX) ? c : c + 1
        const rowEdge = r < 0 ? -1 : Math.abs(ys[r] - e.clientY) <= Math.abs(ys[r + 1] - e.clientY) ? r : r + 1
        const same = old && old.table === table && old.row === r && old.col === c && old.colEdge === colEdge && old.rowEdge === rowEdge && old.line?.kind === line?.kind && old.line?.at === line?.at
        return same ? old : { table: table as HTMLTableElement, row: r, col: c, colEdge, rowEdge, line }
      })
      }
    }
    const typing = () => setHover(null)
    const el = box.current
    document.addEventListener('pointermove', move)
    el?.addEventListener('keydown', typing)
    return () => {
      window.clearTimeout(pending.current)
      document.removeEventListener('pointermove', move)
      el?.removeEventListener('keydown', typing)
    }
  }, [box, drag])

  const el = box.current
  if (!hover || !el || !hover.table.isConnected) return null
  const { table } = hover
  const { xs, ys, rect } = gridOf(table)
  const origin = el.getBoundingClientRect()
  const cols = xs.length - 1
  const rows = ys.length - 1
  if (cols < 1 || rows < 1) return null

  /** Changes the table on the whole text (found from one of its cells) */
  const change = (edit: (t: PMNode) => PMNode | null) => {
    const cell = table.rows[0]?.cells[0]
    const pos = cell ? text.posAtDom(cell, 0) : null
    if (pos === null) return
    setHover(null)
    setLit(null)
    text.change((tr) => {
      const $pos = tr.doc.resolve(Math.min(pos, tr.doc.content.size))
      for (let d = $pos.depth; d > 0; d--) {
        const node = $pos.node(d)
        if (node.type.name !== 'table') continue
        const start = $pos.before(d)
        const next = edit(node)
        if (next) tr.replaceWith(start, start + node.nodeSize, next)
        else tr.delete(start, start + node.nodeSize)
        return
      }
    })
  }

  const startDrag = (kind: 'col' | 'row', from: number) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ kind, from, to: from })
    const onMove = (m: PointerEvent) => {
      const g = gridOf(table)
      const to = kind === 'col' ? nearest(g.xs, m.clientX) : nearest(g.ys, m.clientY)
      setDrag((d) => (d && d.to !== to ? { ...d, to } : d))
    }
    const onUp = (u: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const g = gridOf(table)
      const to = kind === 'col' ? nearest(g.xs, u.clientX) : nearest(g.ys, u.clientY)
      setDrag(null)
      if (to !== from && to !== from + 1) change((t) => (kind === 'col' ? moveColumn(t, from, to) : moveRow(t, from, to)))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const x = (v: number) => v - origin.left
  const y = (v: number) => v - origin.top
  const line = drag ? { kind: drag.kind, at: drag.to } : (lit ?? hover.line)
  const add = (kind: 'col' | 'row', at: number) => change((t) => (kind === 'col' ? insertColumn(t, at) : insertRow(t, at)))

  return (
    <div data-table-tools className="contents">
      {/* The lit grid line, along the whole table: a click on it adds there (while dragging: where the column or row goes) */}
      {line && (
        <button
          type="button"
          aria-label={line.kind === 'col' ? 'Add a column here' : 'Add a row here'}
          onMouseDown={keepFocus}
          onClick={() => !drag && add(line.kind, line.at)}
          style={
            line.kind === 'col'
              ? { left: x(xs[line.at]) - 2, top: y(rect.top), width: 4, height: rect.height }
              : { left: x(rect.left), top: y(ys[line.at]) - 2, width: rect.width, height: 4 }
          }
          className={`absolute z-20 cursor-pointer bg-accent ${drag ? 'pointer-events-none' : 'opacity-70 hover:opacity-100'}`}
        />
      )}
      {!drag && (
        <>
          {/* One + for the column under the pointer (above the table, at its edge nearer the pointer) and one for its row (at the table's left) */}
          {hover.colEdge >= 0 && (
            <PlusAt
              left={x(xs[hover.colEdge])}
              top={y(rect.top) - OUT}
              label="Add a column here"
              onHover={(on) => setLit(on ? { kind: 'col', at: hover.colEdge } : null)}
              onClick={() => add('col', hover.colEdge)}
            />
          )}
          {hover.rowEdge >= 0 && (
            <PlusAt
              left={x(rect.left) - OUT}
              top={y(ys[hover.rowEdge])}
              label="Add a row here"
              onHover={(on) => setLit(on ? { kind: 'row', at: hover.rowEdge } : null)}
              onClick={() => add('row', hover.rowEdge)}
            />
          )}
        </>
      )}
      {/* Above the column under the pointer: drag it, take it away */}
      {hover.col >= 0 && hover.col < cols && (!drag || drag.kind === 'col') && (
        <div
          className="absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-[4px] border border-line bg-surface p-0.5 shadow-md"
          style={{ left: x((xs[hover.col] + xs[hover.col + 1]) / 2), top: y(rect.top) - OUT - 8 }}
        >
          <Tool label="Drag the column" grab onPointerDown={startDrag('col', hover.col)}>
            <LuGripHorizontal aria-hidden className="size-3" />
          </Tool>
          <Tool label="Remove the column" onClick={() => change((t) => deleteColumn(t, hover.col))}>
            <LuMinus aria-hidden className="size-3" />
          </Tool>
        </div>
      )}
      {/* At the left of the row under the pointer, outside its +: drag it, take it away */}
      {hover.row >= 0 && hover.row < rows && (!drag || drag.kind === 'row') && (
        <div
          className="absolute z-30 flex -translate-x-full -translate-y-1/2 flex-col items-center gap-0.5 rounded-[4px] border border-line bg-surface p-0.5 shadow-md"
          // (beside the row's +, inside the text's left margin: the page's box clips what goes past it)
          style={{ left: x(rect.left) - OUT - 9, top: y((ys[hover.row] + ys[hover.row + 1]) / 2) }}
        >
          <Tool label="Drag the row" grab onPointerDown={startDrag('row', hover.row)}>
            <LuGripVertical aria-hidden className="size-3" />
          </Tool>
          <Tool label="Remove the row" onClick={() => change((t) => deleteRow(t, hover.row))}>
            <LuMinus aria-hidden className="size-3" />
          </Tool>
        </div>
      )}
    </div>
  )
}

/** A small square + (rounded corners) centred on a point (the end of a grid line, outside the table) */
function PlusAt({ left, top, label, onHover, onClick }: { left: number; top: number; label: string; onHover: (on: boolean) => void; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={keepFocus}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onClick={onClick}
      style={{ left, top }}
      className="absolute z-30 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[4px] border border-line bg-surface text-fg-muted shadow-sm transition-colors hover:border-accent hover:bg-accent hover:text-white"
    >
      <LuPlus aria-hidden className="size-3" />
    </button>
  )
}
