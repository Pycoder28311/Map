// THE UI CONFIG: how each table of the data config (packages/shared/src/data.config.ts) shows up in the app: its names, icon and
// the screens it is on. Together with the data config it makes the table's resource (createResource.ts), and every generic screen
// (sidebar, list page, panel, Dashboard, Create, Trash, search, Recent) reads the resources. How to change it: instructions/data-config.md.
import type { TableName } from '@map/shared'
import type { ComponentType } from 'react'
import type { PanelProps } from '../features/workspace/types'
import type { MockTableName } from './mock.config'
import { LuBox, LuFileText, LuFolder, LuFolderClosed, LuMap, LuStickyNote } from 'react-icons/lu'
import type { PlainIcon } from '../components/ui/icons/IconSlot'
import type { FieldWidget } from './types'

/** Where a resource shows up; `page: true` gives it a list page at /<its API path> */
export type UiSurfaces = {
  /** Its own sidebar section, or a group of the Orphans section (the items without a parent); rows shown before "Show more" */
  sidebar?: { limit: number; group?: 'own' | 'orphans' }
  page?: boolean
  panel?: boolean
  search?: boolean
  recent?: boolean
  trash?: boolean
  /** A Dashboard column (⋯ on a column) and a row below the columns */
  dashboard?: boolean
  /** The Dashboard's "Take a note…" input makes one */
  quickCreate?: boolean
  /** A tab of the floating Create button's modal */
  create?: boolean
}

/** How one field shows in the form. By default every field shows, with the widget of its kind (text, textarea, rich text) */
export type UiField = { label?: string; placeholder?: string; widget?: FieldWidget; hidden?: boolean }

export type ResourceUi = {
  /** Its kind in panel refs, URLs, layouts and Recent: `note` → `note:5` */
  panelType: string
  label: string
  plural: string
  icon: PlainIcon
  /** What an item with an empty title is called */
  untitled: string
  /** The line under its list page's title */
  pageDescription?: string
  /** Its Dashboard card: a quote of its text (default), a picture on top (the first image of its text), or a map preview */
  card?: 'plain' | 'image' | 'map'
  fields?: Record<string, UiField>
  surfaces: UiSurfaces
  /** Its own panel instead of the item's editor (a map: its board), and whether it fills the pane */
  panel?: { load: () => Promise<{ default: ComponentType<PanelProps> }>; fill?: boolean }
  /** What else happens when an item is copied or deleted for good (a map's board) */
  effects?: { copied?(fromId: string, toId: string): void; deleted?(id: string): void }
}

/** Every screen, for a table that shows everywhere */
const EVERYWHERE: UiSurfaces = { page: true, panel: true, search: true, recent: true, trash: true, dashboard: true, create: true }

/** In this order in the sidebar, on the Dashboard and in the Create modal */
export const RESOURCE_UI: Record<TableName | MockTableName, ResourceUi> = {
  projects: {
    panelType: 'project',
    label: 'Project',
    plural: 'Projects',
    icon: LuFolder,
    untitled: 'Untitled project',
    pageDescription: 'Pinned projects come first.',
    fields: { title: { placeholder: 'Title' }, content: { label: 'Text', placeholder: 'Describe the project…' } },
    surfaces: { ...EVERYWHERE, sidebar: { limit: 5 } },
  },
  notes: {
    panelType: 'note',
    label: 'Note',
    plural: 'Notes',
    icon: LuStickyNote,
    untitled: 'Untitled note',
    pageDescription: 'Pinned notes come first.',
    fields: { title: { placeholder: 'Title' }, content: { label: 'Text', placeholder: 'Take a note…' } },
    surfaces: { ...EVERYWHERE, sidebar: { limit: 5 }, quickCreate: true },
  },
  folders: {
    panelType: 'folder',
    label: 'Folder',
    plural: 'Folders',
    icon: LuFolderClosed,
    untitled: 'Untitled folder',
    fields: { title: { placeholder: 'Title' }, description: { placeholder: 'Description' } },
    surfaces: { ...EVERYWHERE, sidebar: { limit: 5, group: 'orphans' } },
  },
  articles: {
    panelType: 'article',
    label: 'Article',
    plural: 'Articles',
    icon: LuFileText,
    untitled: 'Untitled article',
    fields: { title: { placeholder: 'Title' }, content: { label: 'Text', placeholder: 'Write the article…' } },
    surfaces: { ...EVERYWHERE, sidebar: { limit: 5, group: 'orphans' } },
  },
  objectCards: {
    panelType: 'object',
    label: 'Object card',
    plural: 'Object cards',
    icon: LuBox,
    untitled: 'Untitled object card',
    card: 'image',
    fields: { title: { placeholder: 'Title' }, content: { label: 'Text', placeholder: 'Describe it (pictures too)…' } },
    surfaces: { ...EVERYWHERE, sidebar: { limit: 5, group: 'orphans' } },
  },
  // In memory only (mock.config.ts): no table on the server yet
  maps: {
    panelType: 'map',
    label: 'Map',
    plural: 'Maps',
    icon: LuMap,
    untitled: 'Untitled map',
    card: 'map',
    fields: { title: { placeholder: 'Title' }, branchOf: { hidden: true } },
    surfaces: { ...EVERYWHERE, page: false, sidebar: { limit: 5, group: 'orphans' } },
    panel: { load: () => import('../features/maps/MapPanel'), fill: true },
    effects: {
      copied: (fromId, toId) => void import('../features/board/boardStore').then(({ copyBoard }) => copyBoard(fromId, toId)),
      deleted: (id) => void import('../features/board/boardStore').then(({ dropBoard }) => dropBoard(id)),
    },
  },
}
