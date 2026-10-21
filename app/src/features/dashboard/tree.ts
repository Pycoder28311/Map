// Which Dashboard row an item belongs in: the project it is in (as a child, or deeper, inside a folder of it), else the Orphans row.
// Pure (tree.test.ts). Resources say who can be whose parent (`parents`: the data config's `link`), so nothing here names a table.
import type { AnyResource } from '../../resources/types'

type Item = Record<string, unknown> & { id: number | string }

/** An item with the resource it is of */
export type Entry = { resource: AnyResource; item: Item }

const keyOf = (resource: string, id: number | string) => `${resource}:${id}`
/** How many levels up a folder chain is followed (a cycle cannot be saved, but old data might have one) */
const MAX_DEPTH = 20

/** The resources that are only parents (nothing is their parent, something is theirs): the projects, which get a row each */
export function rootResources(resources: AnyResource[]): AnyResource[] {
  const targets = new Set(resources.flatMap((r) => r.parents?.map((p) => p.resource) ?? []))
  return resources.filter((r) => targets.has(r.name) && !r.parents?.length)
}

/**
 * Sorts the items into rows: `byRoot` (by `<root resource>:<id>`) holds every item whose parent chain reaches that root item, `orphans`
 * the rest (no parent, a parent that is not loaded or not live, a broken or circular chain). Order inside a row: the order given.
 */
export function groupByRoot(entries: Entry[], roots: { resource: AnyResource; items: Item[] }[]): { byRoot: Map<string, Entry[]>; orphans: Entry[] } {
  const rootKeys = new Set(roots.flatMap(({ resource, items }) => items.map((item) => keyOf(resource.name, item.id))))
  const index = new Map(entries.map((entry) => [keyOf(entry.resource.name, entry.item.id), entry]))
  const byRoot = new Map<string, Entry[]>([...rootKeys].map((key) => [key, []]))
  const orphans: Entry[] = []

  for (const entry of entries) {
    let current = entry
    let home: string | null = null
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      const { objectType, objectId } = current.item
      const parent = current.resource.parents?.find((p) => p.type === objectType)
      if (!parent || objectId === null || objectId === undefined) break
      const parentKey = keyOf(parent.resource, objectId as number)
      if (rootKeys.has(parentKey)) {
        home = parentKey
        break
      }
      const next = index.get(parentKey)
      if (!next || next === entry) break
      current = next
    }
    if (home) byRoot.get(home)!.push(entry)
    else orphans.push(entry)
  }
  return { byRoot, orphans }
}

/**
 * The items by their direct parent (`<parent resource>:<id>`): what a tree shows under a node (a project's items, a folder's items).
 * Items without a parent are not in it. Order inside a parent: the order given.
 */
export function groupByParent(entries: Entry[]): Map<string, Entry[]> {
  const byParent = new Map<string, Entry[]>()
  for (const entry of entries) {
    const { objectType, objectId } = entry.item
    const parent = entry.resource.parents?.find((p) => p.type === objectType)
    if (!parent || objectId === null || objectId === undefined) continue
    const key = keyOf(parent.resource, objectId as number)
    byParent.set(key, [...(byParent.get(key) ?? []), entry])
  }
  return byParent
}

/** The `objectType` that names this resource as a parent (a key of the data config's `link.types`), when some resource can be its child */
export function parentTypeOf(resource: AnyResource, resources: AnyResource[]): string | undefined {
  for (const r of resources) {
    const found = r.parents?.find((p) => p.resource === resource.name)
    if (found) return found.type
  }
  return undefined
}
