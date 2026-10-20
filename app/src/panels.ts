// The app's panel registry: every kind of content that can be shown as a workspace panel.
// To make something a panel: add one entry here, then put <OpenAsPanelButton panel={{ type, id }} />
// next to it anywhere (see instructions/adding-a-panel.md). Passed to <WorkspaceProvider> in AppLayout.
import { lazy } from 'react'
import { LuBox, LuFolder, LuFolderOpen, LuLayoutDashboard, LuMap, LuStickyNote } from 'react-icons/lu'
import type { PanelRegistry } from './features/workspace/types'
import { findMap, findObject, findProject } from './mocks/projects'
import { resourcePanels } from './resources/registry'

export const PANELS: PanelRegistry = {
  dashboard: {
    title: () => 'Dashboard',
    icon: LuLayoutDashboard,
    component: lazy(() => import('./pages/Dashboard/DashboardPage')),
    draggable: true,
    route: () => '/dashboard',
    matchRoute: '/dashboard',
  },
  projects: {
    title: () => 'Projects',
    icon: LuFolder,
    component: lazy(() => import('./pages/Projects/ProjectsPage')),
    draggable: true,
    route: () => '/projects',
    matchRoute: '/projects',
  },
  notes: {
    title: () => 'Notes',
    icon: LuStickyNote,
    component: lazy(() => import('./pages/Notes/NotesPage')),
    draggable: true,
    route: () => '/notes',
    matchRoute: '/notes',
  },
  // Panel-only content (no page of its own): shown on /workspace, also alone
  project: {
    title: (id) => findProject(id)?.name ?? 'Project',
    icon: LuFolderOpen,
    component: lazy(() => import('./features/projects/ProjectPanel')),
    draggable: true,
  },
  map: {
    title: (id) => findMap(id)?.name ?? 'Map',
    icon: LuMap,
    component: lazy(() => import('./features/projects/MapPanel')),
    draggable: true,
    fill: true,
  },
  object: {
    title: (id) => findObject(id)?.name ?? 'Object',
    icon: LuBox,
    component: lazy(() => import('./features/objects/ObjectPanel')),
    draggable: true,
  },
  // One panel per resource that can be opened as one (the notes: resources/registry.ts)
  ...resourcePanels(),
}
