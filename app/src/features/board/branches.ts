// Which maps are branches of each other, and which maps are presented together. Pure (branches.test.ts).
import type { MapItem } from '../maps/maps'

const sameId = (a: number | string, b: number | string) => String(a) === String(b)

/** The maps of the current map's branch group, in the order they were made (the map alone when it has no branches) */
export function branchList(maps: MapItem[], mapId: string): MapItem[] {
  const map = maps.find((m) => sameId(m.id, mapId))
  if (!map) return []
  const root = map.branchOf || map.id
  const group = maps.filter((m) => !m.archived && (m.id === root || m.branchOf === root))
  return group.some((m) => sameId(m.id, mapId)) ? group.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id) : [map]
}

/** "Branch 2": the first number that is not a name in the group yet */
export function nextBranchName(group: MapItem[]) {
  const names = new Set(group.map((m) => m.title))
  let n = group.length
  while (names.has(`Branch ${n}`)) n++
  return `Branch ${n}`
}

/** The live maps (itself included, in list order); none when `mapId` is not a live map */
export function siblingMaps(maps: MapItem[], mapId: string): MapItem[] {
  const map = maps.find((m) => sameId(m.id, mapId))
  if (!map || map.archived) return []
  return maps.filter((m) => !m.archived)
}

/** A map of the list, with the branches made from it (in the order they were made) */
export type MapNode = { map: MapItem; branches: MapItem[] }

/** The maps as a tree: each branch group once, its first map on top and the others under it; lone maps have no branches */
export function mapTree(maps: MapItem[]): MapNode[] {
  const nodes = new Map<number, MapNode>()
  for (const map of maps) {
    const root = map.branchOf || map.id
    const node = nodes.get(root)
    if (!node) nodes.set(root, { map, branches: [] })
    else if (map.id === root) nodes.set(root, { map, branches: [node.map, ...node.branches] })
    else node.branches.push(map)
  }
  const byDate = (a: MapItem, b: MapItem) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id
  return [...nodes.values()].map((n) => ({ ...n, branches: [...n.branches].sort(byDate) }))
}
