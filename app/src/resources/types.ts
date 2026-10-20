import type { ComponentType } from 'react'
import type { PlainIcon } from '../components/ui/icons/IconSlot'
import type { ResourceCore } from '../lib/resource/types'
import type { PanelProps } from '../features/workspace/types'

/** The kinds of input a field is edited with (resources/../components/ui/resource/FieldRenderer.tsx has one component for each) */
export const FIELD_WIDGET_NAMES = ['text', 'richText'] as const
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
  /** The sidebar section, with the rows shown before "Show more" */
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
}

/** A field with its name forgotten to a plain string (what the generic form components take) */
export type AnyField = Omit<FieldDef<Record<string, never>>, 'name'> & { name: string }

type Identified = { id: number | string }

/**
 * Everything the app's generic screens know about a table, in one object per table (resources/<table>/<table>.resource.ts), listed once in
 * resources/registry.ts. The types come from the shared contract:
 *   ResourceDefinition<Note, NoteListItem, NoteInput, NoteUpdate, NoteFilter>
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
  ui: {
    label: string
    plural: string
    icon: PlainIcon
    /** What an item with an empty title is called */
    untitled: string
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
  { archived?: boolean; pinned?: boolean; title?: string },
  { archived: boolean }
>

/** A resource with its own types, as the general type (the registry and the generic components take this) */
export const asAnyResource = (resource: unknown) => resource as AnyResource
