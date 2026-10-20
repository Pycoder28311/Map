// Every table the app shows through the generic screens (sidebar, list page, panel, Dashboard, Create, Trash, search, Recent), made
// from the two configs: packages/shared/src/data.config.ts (data) and resources.config.ts (UI). A new table is added there, not here.
import { DATA, TABLE_NAMES } from '@map/shared'
import { createElement, lazy } from 'react'
import type { PanelRegistry } from '../features/workspace/types'
import { createMockApi } from '../lib/api/mockApi'
import { createResource } from './createResource'
import { MOCK_DATA, MOCK_SEED, MOCK_TABLE_NAMES, type MockTableName } from './mock.config'
import { RESOURCE_UI } from './resources.config'
import type { AnyResource, Surfaces } from './types'

const isMock = (name: string): name is MockTableName => (MOCK_TABLE_NAMES as string[]).includes(name)

// The UI config's order is the sidebar's, the Dashboard's and the Create modal's. A table of the data config talks to /api; a mock
// table (mock.config.ts) to its in-memory API
export const RESOURCES: AnyResource[] = (Object.keys(RESOURCE_UI) as (keyof typeof RESOURCE_UI)[]).flatMap((name) => {
  if (isMock(name)) return [createResource(MOCK_DATA[name], RESOURCE_UI[name], createMockApi(MOCK_DATA[name], MOCK_SEED[name]) as never)]
  return TABLE_NAMES.includes(name) ? [createResource(DATA[name], RESOURCE_UI[name])] : []
})

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
          // Read synchronously by the panes, layouts and Recent: the item's own title shows inside the panel
          title: () => r.ui.label,
          icon: r.ui.icon,
          component: lazy(r.loadPanel),
          draggable: true,
          fill: r.fillPanel,
        },
      ]),
  )
}

/** The panel entries of the resources' list pages (keyed by the resource's name, at its page route), spread into PANELS */
export function resourcePages(resources: AnyResource[] = RESOURCES): PanelRegistry {
  return Object.fromEntries(
    resources
      .filter((r) => r.surfaces.page)
      .map((r) => [
        r.name,
        {
          title: () => r.ui.plural,
          icon: r.ui.icon,
          component: lazy(() =>
            import('../components/ui/resource/ResourceListPage').then(({ default: ResourceListPage }) => ({
              default: () => createElement(ResourceListPage, { resource: r }),
            })),
          ),
          draggable: true,
          route: () => r.surfaces.page!,
          matchRoute: r.surfaces.page!,
        },
      ]),
  )
}
