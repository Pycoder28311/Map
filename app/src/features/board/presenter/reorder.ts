// Moving an item of a list to another place. Pure (reorder.test.ts).

/** `ids` with the item at `from` taken out and put so that it ends up at index `to` (the same list for a place that is not one) */
export function moveItem<T>(ids: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= ids.length || to < 0 || to >= ids.length) return ids
  const next = [...ids]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
