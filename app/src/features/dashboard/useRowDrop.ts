import { useDndMonitor, type DragMoveEvent } from '@dnd-kit/core'
import { useLayoutEffect, useRef, type RefObject } from 'react'
import { dragPoint } from '../../lib/dnd'
import { findObject } from '../../mocks/projects'
import { getObjects, moveObject, reorderChildren } from '../../mocks/projectsStore'
import { useDropZone, type DropTargetValue } from '../drag/objectDrop'
import { objectOf } from '../drag/objectDrag'
import { dropPlan, rowParent, type CardSort, type DropPlan, type RowId } from './rows'

/** Where a drag would land on a row: before a card (null: last) */
export type RowTarget = DropTargetValue & { row: RowId; beforeId: string | null }

type FrozenCard = { id: string; kind: string; rect: DOMRect }

/** A finished drop, to undo: the rows' orders before it, and the sort it switched off */
export type RowUndo = { draggedId: string; from: { parentId: string | null; order: string[] }; to: { parentId: string | null; order: string[] }; row: RowId; sort: CardSort | null }

type Options = {
  /** The cards a row shows now (its sort applied), ids in order */
  shownIds: (row: RowId) => string[]
  sortOf: (row: RowId) => CardSort | null
  /** After a drop: what happened, and how to undo it */
  onDropped: (row: RowId, plan: DropPlan, draggedId: string, undo: RowUndo) => void
}

const childIds = (parentId: string | null) => getObjects().filter((o) => o.parentId === parentId && o.kind !== 'project').map((o) => o.id)

/**
 * Drops on the Dashboard's rows (the 'row-card' zone): a card (or any object, e.g. a sidebar row)
 * dragged over a row's strip lands before the card nearest the pointer. The cards' places are measured once per drag, when it first
 * enters a row, so the gap opening for it never changes what's under the pointer. Dropping into a
 * sorted row first makes what's shown its manual order (so the card lands where its gap was), then
 * switches the row to manual.
 */
export function useRowDrop({ shownIds, sortOf, onDropped }: Options) {
  const frozen = useRef(new Map<RowId, FrozenCard[]>())
  useDndMonitor({
    onDragStart: () => frozen.current.clear(),
    onDragEnd: () => frozen.current.clear(),
    onDragCancel: () => frozen.current.clear(),
  })

  const cardsOf = (row: RowId) => {
    let cards = frozen.current.get(row)
    if (!cards) {
      const strip = document.querySelector(`[data-row-strip="${CSS.escape(row)}"]`)
      cards = [...(strip?.querySelectorAll<HTMLElement>('[data-card-id]') ?? [])].map((el) => ({
        id: el.dataset.cardId!,
        kind: el.dataset.cardKind ?? '',
        rect: el.getBoundingClientRect(),
      }))
      frozen.current.set(row, cards)
    }
    return cards
  }

  useDropZone('row-card', {
    target: (e, item) => {
      const row = (e.over?.data.current as { row?: RowId } | undefined)?.row
      const dragged = item?.objectId ? findObject(item.objectId) : undefined
      const p = dragPoint(e as DragMoveEvent)
      if (!row || !dragged || !p) return null
      const cards = cardsOf(row).filter((c) => c.id !== dragged.id)
      const beforeId = cards.find((c) => p.x < c.rect.left + c.rect.width / 2)?.id ?? null
      if (!dropPlan(dragged, { row, beforeId })) return null
      return { key: `${row}:${beforeId ?? 'end'}`, row, beforeId } satisfies RowTarget
    },
    drop: (data, value) => {
      const target = value as RowTarget
      const draggedId = objectOf(data)?.objectId
      const dragged = draggedId ? findObject(draggedId) : undefined
      if (!dragged) return
      const plan = dropPlan(dragged, { row: target.row, beforeId: target.beforeId })
      if (!plan) return
      const undo: RowUndo = {
        draggedId: dragged.id,
        from: { parentId: dragged.parentId, order: childIds(dragged.parentId) },
        to: { parentId: plan.parentId, order: childIds(plan.parentId) },
        row: target.row,
        sort: sortOf(target.row),
      }
      // A sorted row: what's shown becomes its manual order first, so the card lands where its gap was
      if (undo.sort) reorderChildren(rowParent(target.row), shownIds(target.row).filter((id) => id !== dragged.id))
      moveObject(dragged.id, { parentId: plan.parentId, beforeId: plan.beforeId })
      onDropped(target.row, plan, dragged.id, undo)
    },
  })
}

/** Undoes a row drop: the card back where it was, both rows in their old order */
export function undoRowDrop(undo: RowUndo) {
  if (findObject(undo.draggedId)?.parentId !== undo.from.parentId) moveObject(undo.draggedId, { parentId: undo.from.parentId })
  reorderChildren(undo.from.parentId, undo.from.order)
  if (undo.to.parentId !== undo.from.parentId) reorderChildren(undo.to.parentId, undo.to.order)
}

/**
 * The cards of one row glide to their new places when it changes (a gap opening for a drop, a sort,
 * an undo): FLIP on their offsets (not their on-screen rects, which a running glide would skew)
 */
export function useCardFlip(stripRef: RefObject<HTMLElement | null>, key: string) {
  const last = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = new Map<string, number>()
    for (const el of strip.querySelectorAll<HTMLElement>('[data-flip-card]')) {
      const id = el.dataset.flipCard!
      next.set(id, el.offsetLeft)
      const from = last.current.get(id)
      if (!reduce && from !== undefined && from !== el.offsetLeft) {
        el.animate([{ translate: `${from - el.offsetLeft}px 0` }, { translate: '0 0' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
      }
    }
    last.current = next
  }, [stripRef, key])
}
