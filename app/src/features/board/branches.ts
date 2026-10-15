// Which maps are branches of each other, and which maps a project presents. Pure (branches.test.ts).
import type { MockObject } from '../../mocks/projects'

/** The maps of the current map's branch group, in the order they were made (the map alone when it has no branches) */
export function branchList(objects: MockObject[], mapId: string): MockObject[] {
  const map = objects.find((o) => o.id === mapId)
  if (!map) return []
  const root = map.branchOf ?? map.id
  const group = objects.filter((o) => o.kind === 'map' && !o.archived && (o.id === root || o.branchOf === root))
  return group.some((o) => o.id === mapId) ? group.sort((a, b) => a.createdAt - b.createdAt) : [map]
}

/** "Branch 2": the first number that is not a name in the group yet */
export function nextBranchName(group: MockObject[]) {
  const names = new Set(group.map((o) => o.name))
  let n = group.length
  while (names.has(`Branch ${n}`)) n++
  return `Branch ${n}`
}

/** The maps beside this one in its project (itself included, in list order); a map outside a project is alone */
export function siblingMaps(objects: MockObject[], mapId: string): MockObject[] {
  const map = objects.find((o) => o.id === mapId)
  if (!map) return []
  if (map.parentId === null) return [map]
  return objects.filter((o) => o.parentId === map.parentId && o.kind === 'map' && !o.archived)
}

/** A map of a project's list, with the branches made from it (in the order they were made) */
export type MapNode = { map: MockObject; branches: MockObject[] }

/** The maps as a tree: each branch group once, its first map on top and the others under it; lone maps have no branches */
export function mapTree(maps: MockObject[]): MapNode[] {
  const nodes = new Map<string, MapNode>()
  for (const map of maps) {
    const root = map.branchOf ?? map.id
    const node = nodes.get(root)
    if (!node) nodes.set(root, { map, branches: [] })
    else if (map.id === root) nodes.set(root, { map, branches: [node.map, ...node.branches] })
    else node.branches.push(map)
  }
  return [...nodes.values()].map((n) => ({ ...n, branches: [...n.branches].sort((a, b) => a.createdAt - b.createdAt) }))
}
