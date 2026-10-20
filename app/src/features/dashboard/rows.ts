// The Dashboard's rows (Orphans, then one per project): which cards each holds, how they sort, where
// a dropped card goes, and what the undo note says. Pure (rows.test.ts).
import { canPlace, type MockObject } from '../../mocks/projects'

/** A row: Notes (the server's notes: ResourceSection), Orphans (the top-level objects, projects aside) or a project's */
export type RowId = 'notes' | 'orphans' | `project:${string}`

export type CardSort = 'newest' | 'oldest'
export const SORT_LABEL: Record<CardSort, string> = { newest: 'Newest', oldest: 'Oldest' }

/** The parent a row's cards have (null: the top level; Notes, new ones too) */
export const rowParent = (row: RowId): string | null => (row === 'orphans' || row === 'notes' ? null : row.slice('project:'.length))

/**
 * A row's cards in manual order (the sidebar's): the parent's direct children, never projects. The Notes row has none here: its
 * notes come from the server. `objects`: the visible ones
 */
export function rowItems(objects: MockObject[], row: RowId): MockObject[] {
  if (row === 'notes') return []
  const parent = rowParent(row)
  return objects.filter((o) => o.parentId === parent && o.kind !== 'project')
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

export type DropPlan =
  /** Same row, another place */
  | { kind: 'reorder'; parentId: string | null; beforeId: string | null }
  /** Another row */
  | { kind: 'move'; parentId: string | null; beforeId: string | null }

/** What dropping `dragged` on `target` does, or null when it may not go there (canPlace) or nothing changes */
export function dropPlan(dragged: MockObject, target: DropTarget): DropPlan | null {
  // Nothing lands in the Notes row (it shows the server's notes)
  if (dragged.kind === 'project') return null
  if (target.row === 'notes') return null
  const parentId = rowParent(target.row)
  if (!canPlace(dragged.kind, parentId === null ? null : 'project')) return null
  if (target.beforeId === dragged.id) return null
  return { kind: dragged.parentId === parentId ? 'reorder' : 'move', parentId, beforeId: target.beforeId }
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd" */
export function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** The undo note's text after a drop: `place` is the card's new place (1-based) in its row */
export function describeDrop(plan: DropPlan, names: { row: string }, place: number) {
  switch (plan.kind) {
    case 'reorder':
      return `Moved to ${ordinal(place)} in manual order`
    case 'move':
      return `Moved to ${names.row}`
  }
}

/** The sibling right after an object (what it was before, for undo); null: it was last */
export function nextSiblingId(objects: MockObject[], object: MockObject): string | null {
  const at = objects.indexOf(object)
  return objects.slice(at + 1).find((o) => o.parentId === object.parentId && o.kind !== 'project')?.id ?? null
}
