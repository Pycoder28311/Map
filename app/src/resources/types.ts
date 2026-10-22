import type { ComponentType } from 'react'
import type { PlainIcon } from '../components/ui/icons/IconSlot'
import type { ResourceCore } from '../lib/resource/types'
import type { PanelProps } from '../features/workspace/types'

/** The kinds of input a field is edited with (resources/../components/ui/resource/FieldRenderer.tsx has one component for each) */
export const FIELD_WIDGET_NAMES = ['text', 'textarea', 'richText'] as const
export type FieldWidget = (typeof FIELD_WIDGET_NAMES)[number]

/** One field of the edit form. `name` is checked against the resource's contract type: a field removed there fails the build here */
export type FieldDef<TItem> = {
  name: keyof TItem & string
  widget: FieldWidget
  /** Screen-reader name (default: the name) */
  label?: string
  placeholder?: string
  /** A text field shown as the item's heading (the title) */
  heading?: boolean
}

/** Where a resource shows up. Each flag turns one screen on for it: the Trash, the search, Recent… read these */
export type Surfaces = {
  /** In the sidebar: its own section, with the rows shown before "Show more" */
  sidebar?: { limit: number }
  /** Its list page (route) */
  page?: string
  /** Can be opened as a workspace panel (type `panelType`) */
  panel?: boolean
  /** The navbar search looks in it */
  search?: boolean
  /** Opening one is kept in Recent */
  recent?: boolean
  /** Its archived items show in the Trash */
  trash?: boolean
  /** It has a column and a row on the Dashboard */
  dashboard?: boolean
  /** The Dashboard's "Take a note…" card creates one */
  quickCreate?: boolean
  /** A tab of the floating Create button's modal */
  create?: boolean
  /** Opens in a centred modal (with a button to its page) from the sidebar, instead of going to its page */
  modal?: boolean
}

/** A field with its name forgotten to a plain string (what the generic form components take) */
export type AnyField = Omit<FieldDef<Record<string, never>>, 'name'> & { name: string }

type Identified = { id: number | string }

/**
 * Everything the app's generic screens know about a table, in one object per table (resources/<table>/<table>.resource.ts), listed once in
 * resources/registry.ts. The types come from the shared contract:
 *   ResourceDefinition<Item<'notes'>, ListItem<'notes'>, Input<'notes'>, Update<'notes'>, Filter<'notes'>>
 */
export type ResourceDefinition<
  TItem extends Identified,
  TListItem extends Identified,
  TInput,
  TUpdate extends { archived?: boolean },
  TFilter extends { archived: boolean },
> = ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter> & {
  /** The workspace panel type of one item (`note` → `note:5` in URLs, layouts and Recent) */
  panelType: string
  /** The panel component, loaded when first shown */
  loadPanel: () => Promise<{ default: ComponentType<PanelProps> }>
  /** Its items can have a parent (objectType + objectId: the data config's `link`): which types, and the resource each one is */
  parents?: { type: string; resource: string }[]
  /** Whether its items can have a parent */
  linked?: boolean
  /** Its panel is its own (a map's board), not the item's editor: it opens in a pane, not in the modal */
  customPanel?: boolean
  /** Its panel takes the whole pane, without padding or scrolling (a map's board) */
  fillPanel?: boolean
  /** What else happens when an item is copied (Duplicate) or deleted for good, e.g. a map's board is copied or dropped */
  effects?: { copied?(fromId: string, toId: string): void; deleted?(id: string): void }
  ui: {
    label: string
    plural: string
    icon: PlainIcon
    /** What an item with an empty title is called */
    untitled: string
    /** The line under the title of its list page */
    pageDescription?: string
    /** Its look as a Dashboard card: a quote of its text (default), a picture on top, or a map preview */
    card?: 'plain' | 'image' | 'map'
    fields: FieldDef<TItem>[]
    /** A row of the item in a list (method syntax: see ResourceApi) */
    row: {
      title(item: TListItem): string
      subtitle?(item: TListItem): string | undefined
      pinned?(item: TListItem): boolean
    }
  }
  surfaces: Surfaces
}

/** A resource with its types forgotten: what the registry holds and the generic screens take */
export type AnyResource = ResourceDefinition<
  Identified & Record<string, unknown>,
  Identified & Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown> & { archived?: boolean; pinned?: boolean; title?: string },
  { archived: boolean }
>

/** A resource with its own types, as the general type (the registry and the generic components take this) */
export const asAnyResource = (resource: unknown) => resource as AnyResource
