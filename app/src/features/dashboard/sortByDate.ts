// The cards of a resource's Dashboard row, sorted by date. Pure (sortByDate.test.ts).

/** A row's sort (none: the server's order) */
export type CardSort = 'newest' | 'oldest'
export const SORT_LABEL: Record<CardSort, string> = { newest: 'Newest', oldest: 'Oldest' }

type Item = { id: number | string; createdAt?: string }

/** The cards sorted by the date they were made (a copy), or in the server's order without a sort. Ties: by id */
export function sortByDate<T extends Item>(items: T[], sort: CardSort | null): T[] {
  if (!sort) return items
  const at = (item: Item) => (item.createdAt ? Date.parse(item.createdAt) : 0)
  return [...items].sort((a, b) => (sort === 'newest' ? at(b) - at(a) : at(a) - at(b)) || Number(a.id) - Number(b.id))
}
