// Where a moved item goes in an ordered list, as keys (shared/position.ts): the one place the Dashboard rows and the sidebar work
// out a drop. A list may mix resources (a project's articles, folders, notes…): keys of every table compare with each other.
// Pure (reorder.test.ts), except moveItem, which sends the result through the resource's update (shown at once, undone on refusal).
import { comparePositions, isPosition, positionAfter, positionBefore, positionBetween, positionsBetween } from '@map/shared'
import type { AnyResource } from '../../resources/types'
import { actionsOf } from './hooks'

type Item = Record<string, unknown> & { id: number | string }
/** An item with the resource it is of */
export type Entry = { resource: AnyResource; item: Item }

const pinnedOf = (entry: Entry) => entry.item.pinned === true
const keyOf = (entry: Entry | undefined) => (entry && isPosition(entry.item.position) ? entry.item.position : null)
/** The same item (resources and ids together) */
export const sameEntry = (a: Entry, b: Entry) => a.resource.name === b.resource.name && String(a.item.id) === String(b.item.id)

/** The order of a list of several resources, the server's rule across them: pinned first, then position, then resource and id */
export function compareEntries(a: Entry, b: Entry): number {
  return (
    Number(pinnedOf(b)) - Number(pinnedOf(a)) ||
    comparePositions(keyOf(a) ?? '', keyOf(b) ?? '') ||
    a.resource.name.localeCompare(b.resource.name) ||
    Number(a.item.id) - Number(b.item.id)
  )
}

/** A position update of another item, to make room (equal keys around the place: two tabs moved at once) */
export type Fix = { entry: Entry; position: string }
export type Placement = { position: string; fixes: Fix[] }
/** What a move writes: a new place (none: the item keeps its place and only its parent changes) and the new keys of tied items */
export type MovePlan = { position?: string; fixes: Fix[] }

/**
 * The position of `moved` put at `index` of `list` (the ordered list without it; index 0 = first, list.length = last). Null when
 * the place is not in the item's own group (a pinned item among unpinned ones or the reverse) or no key can be made.
 * Usually one key between the neighbours; when they have equal keys the tied run gets new keys too (`fixes`).
 */
export function placement(list: Entry[], index: number, moved: Entry): Placement | null {
  const pinned = pinnedOf(moved)
  const before = list[index - 1]
  const after = list[index]
  // Pinned come first: a pinned item may not follow an unpinned one, an unpinned one may not come before a pinned one
  if ((pinned && before && !pinnedOf(before)) || (!pinned && after && pinnedOf(after))) return null
  const group = list.filter((entry) => pinnedOf(entry) === pinned)
  const at = list.slice(0, index).filter((entry) => pinnedOf(entry) === pinned).length
  const low = keyOf(group[at - 1])
  const high = keyOf(group[at])
  const direct = positionBetween(low, high)
  if (direct) return { position: direct, fixes: [] }

  // Equal (or unordered) neighbours: widen to the run of items that are not strictly ordered, and give it new keys
  let start = Math.max(at - 1, 0)
  let end = Math.min(at, group.length - 1)
  const ordered = (i: number) => {
    const a = keyOf(group[i])
    const b = keyOf(group[i + 1])
    return a !== null && b !== null && comparePositions(a, b) < 0
  }
  while (start > 0 && !ordered(start - 1)) start--
  while (end < group.length - 1 && !ordered(end)) end++
  const run = [...group.slice(start, at), moved, ...group.slice(at, end + 1)]
  const keys = positionsBetween(keyOf(group[start - 1]), keyOf(group[end + 1]), run.length)
  if (!keys) return null
  return {
    position: keys[run.indexOf(moved)],
    fixes: run.flatMap((entry, i) => (entry === moved ? [] : [{ entry, position: keys[i] }])),
  }
}

/** Where `moved` goes at the end of a list: after the last item of its own group */
export function endIndex(list: Entry[], moved: Entry): number {
  if (!pinnedOf(moved)) return list.length
  return list.filter(pinnedOf).length
}

/** The key for a new item at the end of a list (its unpinned part) */
export function positionAtEnd(list: Entry[]): string {
  const last = [...list].reverse().find((entry) => !pinnedOf(entry))
  return positionAfter(keyOf(last))
}

/** The key before everything in a list (its first item), for a list that starts empty or with unkeyed items */
export const positionAtStart = (list: Entry[]) => positionBefore(keyOf(list[0]))

/**
 * Moves an item: one update of its position (and its parent, when `parent` is given: null = none), and of the tied items when
 * there are fixes. Each is shown at once and taken back if the server refuses (useResourceActions' update)
 */
export function moveItem(moved: Entry, { position, fixes }: MovePlan, parent?: { type: string; id: number } | null) {
  const patch = { ...(position !== undefined ? { position } : {}), ...(parent !== undefined ? { objectType: parent?.type ?? null, objectId: parent?.id ?? null } : {}) }
  const sent = [
    actionsOf(moved.resource).update(moved.item.id, patch as never),
    ...fixes.map(({ entry, position: key }) => actionsOf(entry.resource).update(entry.item.id, { position: key } as never)),
  ]
  return Promise.all(sent)
}
