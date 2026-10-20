// The Dashboard's rows (Projects, Notes, Objects): which cards the Objects row holds, how they sort, where a dropped card goes, and
// what the undo note says. Pure (rows.test.ts).
import type { MockObject } from '../../mocks/projects'

/** A row: Projects and Notes (the server's items: ResourceSection) or Objects (the mock maps and object cards) */
export type RowId = 'projects' | 'notes' | 'objects'

export type CardSort = 'newest' | 'oldest'
export const SORT_LABEL: Record<CardSort, string> = { newest: 'Newest', oldest: 'Oldest' }

/** A row's cards in manual order (the sidebar's). The resources' rows have none here: their items come from the server. `objects`: the visible ones */
export function rowItems(objects: MockObject[], row: RowId): MockObject[] {
  return row === 'objects' ? objects : []
}

/** Sorted (a copy), or as they are without a sort. Ties: by name */
export function sortCards(items: MockObject[], sort: CardSort | null): MockObject[] {
  if (!sort) return items
  const byName = (a: MockObject, b: MockObject) => a.name.localeCompare(b.name)
  const compare = {
    newest: (a: MockObject, b: MockObject) => b.createdAt - a.createdAt || byName(a, b),
    oldest: (a: MockObject, b: MockObject) => a.createdAt - b.createdAt || byName(a, b),
  }[sort]
  return [...items].sort(compare)
}

/** Where a dropped card goes: before `beforeId` in a row (null: last) */
export type DropTarget = { row: RowId; beforeId: string | null }

/** Another place in the Objects row */
export type DropPlan = { kind: 'reorder'; beforeId: string | null }

/** What dropping `dragged` on `target` does, or null when it may not go there or nothing changes */
export function dropPlan(dragged: MockObject, target: DropTarget): DropPlan | null {
  // Nothing lands in the resources' rows (they show the server's items)
  if (target.row !== 'objects') return null
  if (target.beforeId === dragged.id) return null
  return { kind: 'reorder', beforeId: target.beforeId }
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd" */
export function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** The undo note's text after a drop: `place` is the card's new place (1-based) in its row */
export const describeDrop = (place: number) => `Moved to ${ordinal(place)} in manual order`
