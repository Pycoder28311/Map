import { useDndMonitor, type DragMoveEvent } from '@dnd-kit/core'
import { useRef, useState, type RefObject } from 'react'
import { dragPoint } from '../../lib/dnd'
import { useTimeout } from '../../lib/useTimeout'
import type { PanelDragData } from '../workspace/types'
import { snapshotBlocks } from './blockFlip'
import { moveColumn, type ColumnId } from './columns'

/** The pointer must rest this long over a new place before the columns make room (ms) */
const DWELL = 100

type ColumnDrag = Extract<PanelDragData, { kind: 'column' }>

/**
 * Dragging a column by its grip: while it's held, the columns are shown as if it were dropped at the
 * place nearest the pointer (`preview`), sliding to make room; the drop keeps that order (`move`).
 * The places ([data-column-slot] in `rootRef`) are measured at the start, so re-ordering never changes
 * what's under the pointer. Works across and down (stacked columns on narrow screens).
 */
export function useColumnDrag(rootRef: RefObject<HTMLElement | null>, columns: ColumnId[], move: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<ColumnDrag | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const slots = useRef<DOMRect[]>([])
  const aimed = useRef<number | null>(null)
  const timer = useTimeout()

  const placeAt = (e: DragMoveEvent) => {
    const p = dragPoint(e)
    if (!p || slots.current.length === 0) return null
    let best = 0
    let bestDist = Infinity
    slots.current.forEach((r, i) => {
      const d = Math.hypot(p.x - (r.left + r.width / 2), p.y - (r.top + r.height / 2))
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    })
    return best
  }

  const reset = () => {
    timer.clear()
    aimed.current = null
    setDrag(null)
    setTarget(null)
  }

  useDndMonitor({
    onDragStart: ({ active }) => {
      const data = active.data.current as PanelDragData | undefined
      if (data?.kind !== 'column') return
      slots.current = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-column-slot]') ?? [])].map((el) => el.getBoundingClientRect())
      setDrag(data)
    },
    onDragMove: (e) => {
      if (!drag) return
      const next = placeAt(e)
      if (next === aimed.current) return
      aimed.current = next
      timer.set(() => {
        snapshotBlocks()
        setTarget(next)
      }, DWELL)
    },
    onDragEnd: (e) => {
      if (!drag) return
      const final = placeAt(e)
      reset()
      // The preview already shows it there: nothing glides
      if (final !== null && final !== drag.index) move(drag.index, final)
    },
    onDragCancel: () => {
      if (!drag) return
      snapshotBlocks()
      reset()
    },
  })

  const preview = drag && target !== null ? moveColumn(columns, drag.index, target) : null
  return { shown: preview ?? columns, draggingIndex: drag?.index ?? null }
}
