// MOCK DATA: fake content in the shape the real data will have. Replaced by data from the backend
// later (e.g. the user's projects and maps turned into tree nodes); the components stay the same.
import { LuFolder, LuFolderKanban, LuFolderOpen, LuInfo, LuLayoutDashboard, LuMap } from 'react-icons/lu'
import type { TreeNode } from '../components/ui/tree/types'
import { PROJECTS } from './projects'

/**
 * What the sidebar shows; every row has an icon. Rows with `panel` open it on click (folders too: their
 * arrow opens/closes them) and, with `draggable`, can be dragged onto the current page or a panel.
 */
export const SIDEBAR_TREE: TreeNode[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LuLayoutDashboard,
    panel: { type: 'dashboard' },
    draggable: true,
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: LuFolder,
    openIcon: LuFolderOpen,
    // Click: the page of all projects; arrow: the projects below
    panel: { type: 'projects' },
    draggable: true,
    children: [
      ...PROJECTS.map(
        (project): TreeNode => ({
          id: `project-${project.id}`,
          label: project.name,
          icon: LuFolderKanban,
          children: [
            {
              id: `project-${project.id}-overview`,
              label: 'Overview',
              icon: LuInfo,
              panel: { type: 'project', id: project.id },
              draggable: true,
            },
            ...project.maps.map(
              (map): TreeNode => ({
                id: `map-${map.id}`,
                label: map.name,
                icon: LuMap,
                panel: { type: 'map', id: map.id },
                draggable: true,
              }),
            ),
          ],
        }),
      ),
    ],
  },
]
