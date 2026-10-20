import type { AnyResource } from '../../../resources/types'

/**
 * The list a resource shows in the sidebar: in the Orphans section, only its items without a parent (when it can have one); in its
 * own section, all. The Pinned section reads the same lists (no request of its own).
 */
export const sidebarFilter = (resource: AnyResource): Record<string, string> | undefined =>
  resource.surfaces.sidebar?.group === 'orphans' && resource.linked ? { objectType: 'none' } : undefined
