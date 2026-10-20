// The app's panel registry: every kind of content that can be shown as a workspace panel.
// To make something a panel: add one entry here, then put <OpenAsPanelButton panel={{ type, id }} />
// next to it anywhere (see instructions/adding-a-panel.md). Passed to <WorkspaceProvider> in AppLayout.
import { lazy } from 'react'
import { LuLayoutDashboard } from 'react-icons/lu'
import type { PanelRegistry } from './features/workspace/types'
import { resourcePages, resourcePanels } from './resources/registry'

export const PANELS: PanelRegistry = {
  dashboard: {
    title: () => 'Dashboard',
    icon: LuLayoutDashboard,
    component: lazy(() => import('./pages/Dashboard/DashboardPage')),
    draggable: true,
    route: () => '/dashboard',
    matchRoute: '/dashboard',
  },
  // Each resource's list page (Projects, Notes…) and one panel per resource item: a note, a map… (resources/registry.ts)
  ...resourcePages(),
  ...resourcePanels(),
}
