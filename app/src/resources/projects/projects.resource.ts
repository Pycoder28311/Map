import type { Project, ProjectFilter, ProjectInput, ProjectListItem, projectsConfig, ProjectUpdate } from '@map/shared'
import { LuFolder } from 'react-icons/lu'
import { createResourceApi } from '../../lib/api/resource'
import type { ResourceDefinition } from '../types'

/** The same flags as projectsConfig.order (packages/shared/src/projects.ts); the type fails here if they ever differ */
export const PROJECTS_ORDER: typeof projectsConfig.order = { pinned: true, position: true }

/** The projects table in the app: its calls, its names, its form fields, and the screens it shows up on */
export const projectsResource: ResourceDefinition<Project, ProjectListItem, ProjectInput, ProjectUpdate, ProjectFilter> = {
  name: 'projects',
  panelType: 'project',
  api: createResourceApi<Project, ProjectListItem, ProjectInput, ProjectUpdate, ProjectFilter>('/api/projects'),
  // A written project goes into the lists in the server's order, without its content (the list's version of it)
  list: {
    order: PROJECTS_ORDER,
    toItem: ({ content: _content, ...item }) => item,
  },
  loadPanel: () => import('./ProjectPanel'),
  ui: {
    label: 'Project',
    plural: 'Projects',
    icon: LuFolder,
    untitled: 'Untitled project',
    fields: [
      { name: 'title', widget: 'text', placeholder: 'Title', heading: true },
      { name: 'content', widget: 'richText', label: 'Text', placeholder: 'Describe the project…' },
    ],
    row: {
      title: (project) => project.title.trim() || 'Untitled project',
      subtitle: (project) => project.preview || undefined,
      pinned: (project) => project.pinned,
    },
  },
  surfaces: { sidebar: { limit: 5 }, page: '/projects', panel: true, search: true, recent: true, trash: true, dashboard: true },
}
