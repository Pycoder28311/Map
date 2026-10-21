// The maps (a mock resource for now: resources/mock.config.ts), as the board's code reads and writes them. Every screen shares the
// same list in the store, so the sidebar, the Dashboard, the map picker and the presenter agree.
import { PAGE_SIZE_MAX, positionsBetween } from '@map/shared'
import { actionsOf, useResourceItem, useResourceList } from '../../lib/resource/hooks'
import { resourceByName } from '../../resources/registry'
import { copyBoard } from '../board/boardStore'

export const mapsResource = resourceByName('maps')!

/** A map as its resource holds it. `branchOf`: the first map of its branch group (0: not a branch) */
export type MapItem = { id: number; title: string; branchOf: number; archived: boolean; pinned: boolean; position: string; createdAt: string }

/** Every live map, in the list's order (pinned, position, id) */
export function useMaps(): MapItem[] {
  return useResourceList(mapsResource, { limit: PAGE_SIZE_MAX }).items as unknown as MapItem[]
}

/** One map (null while it loads); `gone`: deleted or in the Trash */
export function useMap(id: string | undefined): { map: MapItem | null; gone: boolean } {
  const { item, notFound } = useResourceItem(mapsResource, id)
  const map = item as unknown as MapItem | null
  return { map, gone: notFound || map?.archived === true }
}

/** A map's name (its title, or "Untitled map") */
export const mapName = (map: MapItem) => mapsResource.ui.row.title(map as never)

/**
 * A branch of a map, like a branch of a chat: a copy of it, with everything drawn on it, next to it. They keep to one branch group
 * (`branchOf`: the group's first map). Resolves with the new map's id (undefined for anything that is not a live map)
 */
export async function createBranch(maps: MapItem[], mapId: string, name: string): Promise<string | undefined> {
  const map = maps.find((m) => String(m.id) === mapId)
  if (!map || map.archived) return undefined
  const root = map.branchOf || map.id
  const { create, update } = actionsOf(mapsResource)
  const made = await create({ title: name, branchOf: root, position: map.position })
  if (!map.branchOf) await update(map.id, { branchOf: root })
  copyBoard(mapId, String(made.id))
  return String(made.id)
}

/** The maps in this order: each gets a new key (shared/position.ts), in this order */
export async function reorderMaps(ids: (number | string)[]) {
  const { update } = actionsOf(mapsResource)
  const keys = positionsBetween(null, null, ids.length) ?? []
  await Promise.all(ids.map((id, i) => update(id, { position: keys[i] })))
}

/** Renames a map */
export const renameMap = (id: number | string, title: string) => actionsOf(mapsResource).update(id, { title })
