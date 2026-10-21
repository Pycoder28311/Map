// Which resources have rows and which fill them. Shared by the Dashboard and the sidebar, so both read the same lists (one store entry each).
import { RESOURCES, resourcesWith } from '../../resources/registry'
import { rootResources } from './tree'

/** The resources whose items get a row each (the projects) */
export const ROOTS = rootResources(RESOURCES)
/** What the rows hold: the other resources of the Dashboard, in the UI config's order */
export const CHILDREN = resourcesWith('dashboard').filter((r) => !ROOTS.includes(r))
