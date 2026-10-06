// MOCK DATA: fake content in the shape the real data will have. Replaced by data from the backend
// later (e.g. the user's projects and maps turned into tree nodes); the components stay the same.
import { LuFolder, LuFolderOpen, LuLayoutDashboard, LuMap } from 'react-icons/lu'
import type { TreeNode } from '../components/ui/tree/types'
import { PROJECTS } from './projects'

/** What the sidebar shows. Leaves with `draggable` can be dragged onto the current page or a panel */
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
    children: [
      { id: 'projects-all', label: 'All projects', icon: LuFolder, panel: { type: 'projects' }, draggable: true },
      ...PROJECTS.map(
        (project): TreeNode => ({
          id: `project-${project.id}`,
          label: project.name,
          children: [
            {
              id: `project-${project.id}-overview`,
              label: 'Overview',
              icon: LuFolderOpen,
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
