// THE UI CONFIG: how each table of the data config (packages/shared/src/data.config.ts) shows up in the app: its names, icon and
// the screens it is on. Together with the data config it makes the table's resource (createResource.ts), and every generic screen
// (sidebar, list page, panel, Dashboard, Create, Trash, search, Recent) reads the resources. How to change it: instructions/data-config.md.
import type { TableName } from '@map/shared'
import type { ComponentType } from 'react'
import type { PanelProps } from '../features/workspace/types'
import type { MockTableName } from './mock.config'
import { LuBox, LuFileText, LuFolder, LuFolderClosed, LuLayoutTemplate, LuMap, LuStickyNote } from 'react-icons/lu'
import type { PlainIcon } from '../components/ui/icons/IconSlot'
import type { FieldWidget } from './types'

/** Where a resource shows up; `page: true` gives it a list page at /<its API path> */
export type UiSurfaces = {
  /** Its own sidebar section, with the rows shown before "Show more" */
  sidebar?: { limit: number }
  page?: boolean
  panel?: boolean
  search?: boolean
  recent?: boolean
  trash?: boolean
  /** A Dashboard column (⋯ on a column), its items in the project rows below the columns, and a Create there */
  dashboard?: boolean
  /** The Dashboard's big input can make one (a button chooses which: note, article) */
  quickCreate?: boolean
  /** A tab of the floating Create button's modal */
  create?: boolean
  /** Opens in a centred modal (with a button to its page) from the sidebar, instead of going to its page */
  modal?: boolean
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
  card?: 'plain' | 'image' | 'map' | 'folder'
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
    surfaces: { ...EVERYWHERE, sidebar: { limit: 5 }, quickCreate: true, modal: true },
  },
  folders: {
    panelType: 'folder',
    label: 'Folder',
    plural: 'Folders',
    icon: LuFolderClosed,
    untitled: 'Untitled folder',
    card: 'folder',
    fields: { title: { placeholder: 'Title' }, description: { placeholder: 'Description' } },
    surfaces: { ...EVERYWHERE },
  },
  articles: {
    panelType: 'article',
    label: 'Article',
    plural: 'Articles',
    icon: LuFileText,
    untitled: 'Untitled article',
    card: 'image',
    fields: { title: { placeholder: 'Title' }, content: { label: 'Text', placeholder: 'Write the article…' } },
    surfaces: { ...EVERYWHERE, quickCreate: true },
    // Its page: toolbar, text and Info box (features/articles)
    panel: { load: () => import('../features/articles/ArticlePanel') },
  },
  objectCards: {
    panelType: 'object',
    label: 'Object card',
    plural: 'Object cards',
    icon: LuBox,
    untitled: 'Untitled object card',
    card: 'image',
    fields: { title: { placeholder: 'Title' }, content: { label: 'Text', placeholder: 'Describe it (pictures too)…' } },
    surfaces: { ...EVERYWHERE },
  },
  // Saved pane layouts: shown by the sidebar's Layouts section (features/layouts), and in the Trash when archived. No other screen
  layouts: {
    panelType: 'layout',
    label: 'Layout',
    plural: 'Layouts',
    icon: LuLayoutTemplate,
    untitled: 'Layout',
    fields: Object.fromEntries(
      ['template', 'panelA', 'panelB', 'panelC', 'panelD'].map((name) => [name, { hidden: true }]),
    ),
    surfaces: { trash: true },
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
    surfaces: { ...EVERYWHERE, page: false },
    panel: { load: () => import('../features/maps/MapPanel'), fill: true },
    effects: {
      copied: (fromId, toId) => void import('../features/board/boardStore').then(({ copyBoard }) => copyBoard(fromId, toId)),
      deleted: (id) => void import('../features/board/boardStore').then(({ dropBoard }) => dropBoard(id)),
    },
  },
}
