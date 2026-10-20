// Every table the app shows through the generic screens (sidebar section, list page, panel, Trash, search, Recent). A new table
// is added here and nowhere else: write its resources/<table>/<table>.resource.ts and list it.
import { lazy } from 'react'
import type { PanelRegistry } from '../features/workspace/types'
import { notesResource } from './notes/notes.resource'
import { asAnyResource, type AnyResource, type Surfaces } from './types'

export const RESOURCES: AnyResource[] = [asAnyResource(notesResource)]

export const resourceByName = (name: string) => RESOURCES.find((r) => r.name === name)
export const resourceByPanelType = (type: string | undefined) => (type ? RESOURCES.find((r) => r.panelType === type) : undefined)

/** The resources that turned a screen on (e.g. `resourcesWith('trash')`) */
export const resourcesWith = (surface: keyof Surfaces) => RESOURCES.filter((r) => r.surfaces[surface])

/** The workspace panel entries of the resources that can be opened as a panel (spread into PANELS in panels.ts) */
export function resourcePanels(resources: AnyResource[] = RESOURCES): PanelRegistry {
  return Object.fromEntries(
    resources
      .filter((r) => r.surfaces.panel)
      .map((r) => [
        r.panelType,
        {
          // Read synchronously by the panes, layouts and Recent: the item's own title shows inside the panel (the real titles come with the cache)
          title: () => r.ui.label,
          icon: r.ui.icon,
          component: lazy(r.loadPanel),
          draggable: true,
        },
      ]),
  )
}
