import { useResourceMenu } from '../../../lib/resource/actions'
import type { AnyResource } from '../../../resources/types'

export type ResourceMenu = ReturnType<typeof useResourceMenu>

/**
 * The ⋯ menu (and its dialogs) of each of these resources, by resource name: for rows of several resources in one tree (a project's
 * children). The list must be the same on every render (a module constant, or empty): hooks cannot be called a changing number of times.
 */
export function useChildMenus(resources: readonly AnyResource[]): Map<string, ResourceMenu> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return new Map(resources.map((resource) => [resource.name, useResourceMenu(resource)]))
}
