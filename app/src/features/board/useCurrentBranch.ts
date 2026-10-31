import { useMaps } from '../maps/maps'
import { branchList } from './branches'

/** The name of the branch open now ('main': the map itself) and how many maps the branch group has (the title bar's ⋯ says it) */
export function useCurrentBranch(mapId: string) {
  const group = branchList(useMaps(), mapId)
  const map = group.find((o) => String(o.id) === mapId)
  const main = !map || !map.branchOf || map.branchOf === map.id
  return { current: main ? 'main' : map.title, count: group.length }
}
