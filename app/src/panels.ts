// The app's panel registry: every kind of content that can be shown as a workspace panel.
// To make something a panel: add one entry here, then put <OpenAsPanelButton panel={{ type, id }} />
// next to it anywhere (see instructions/adding-a-panel.md). Passed to <WorkspaceProvider> in AppLayout.
import { lazy } from 'react'
import { LuBox, LuFileText, LuFolder, LuFolderOpen, LuFolders, LuLayoutDashboard, LuMap, LuStickyNote } from 'react-icons/lu'
import type { PanelRegistry } from './features/workspace/types'
import { findMap, findObject, findProject } from './mocks/projects'

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
  note: {
    title: (id) => findObject(id)?.name ?? 'Note',
    icon: LuStickyNote,
    component: lazy(() => import('./features/notes/NotePanel')),
    draggable: true,
  },
  object: {
    title: (id) => findObject(id)?.name ?? 'Object',
    icon: LuBox,
    component: lazy(() => import('./features/objects/ObjectPanel')),
    draggable: true,
  },
  // Its articles, as cards
  folder: {
    title: (id) => findObject(id)?.name ?? 'Folder',
    icon: LuFolders,
    component: lazy(() => import('./features/objects/FolderPanel')),
    draggable: true,
  },
  // Behaves like a note: the same panel
  article: {
    title: (id) => findObject(id)?.name ?? 'Article',
    icon: LuFileText,
    component: lazy(() => import('./features/notes/NotePanel')),
    draggable: true,
  },
}
