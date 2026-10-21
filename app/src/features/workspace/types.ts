import type { ComponentType } from 'react'
import type { ButtonIcon, PlainIcon } from '../../components/ui/icons/IconSlot'
import type { Slot } from './layout'

/** Which panel: its registered type and, for items like a map, its id. Fits in the URL */
export type PanelRef = { type: string; id?: string }

export type PanelProps = { id?: string }

/**
 * A dragged object, wherever it's dragged from (a sidebar row, a list row in a pane…): which object it
 * is (if any), its kind, its sidebar row (if dragged from there), its icon, and where it comes from
 */
export type ObjectDragInfo = {
  objectId?: string
  /** e.g. 'note', 'map', 'project' */
  kind?: string
  /** The sidebar row it was dragged from (its place shows as an outline) */
  nodeId?: string
  icon?: ButtonIcon
  source: 'sidebar' | 'pane'
  /** The parent it is in now (a project or folder item has one): a drop on that same parent changes nothing; unknown: any drop may */
  parent?: { type: string | null; id: number | null }
  /** Pinned items stay among the pinned (a drop keeps it in its group) */
  pinned?: boolean
}

/**
 * What a drag carries:
 * - new: a panel from outside the workspace (a sidebar item, a list row…), dropped on an edge;
 *   `object` when it's an object (it can also be dropped on sidebar rows, link nodes, the trash…)
 * - object: an object with no panel of its own (e.g. a sidebar row that only holds a group): object drops only
 * - pane: a panel of the workspace (its grip, Pane), dropped on an edge or the centre of another
 * - layout: a saved layout's tile (sidebar), dropped on the trash
 * - column: a Dashboard column by its grip, dropped among the other columns only (features/dashboard)
 */
export type PanelDragData =
  | { kind: 'new'; panel: PanelRef; label: string; object?: ObjectDragInfo }
  | { kind: 'object'; label: string; object: ObjectDragInfo }
  | { kind: 'pane'; panel: PanelRef; label: string; from: Slot }
  | { kind: 'layout'; layoutId: string; label: string }
  | { kind: 'column'; index: number; label: string }

/** How one panel type looks and behaves. Registered once per type (see src/panels.ts) */
export type PanelDefinition = {
  title: (id?: string) => string
  icon: PlainIcon
  component: ComponentType<PanelProps>
  /** May be combined with other panels (dragged in, or receive drops) */
  draggable: boolean
  /** Fills the panel's whole area (no page padding, no scrolling): the content gets a definite height, e.g. the map editor */
  fill?: boolean
  /** Its own page, if it has one: used for "Full page" and when it's the only panel left */
  route?: (id?: string) => string
  /** Route pattern of that page, so the current page can act as a panel (drop target) */
  matchRoute?: string
}

export type PanelRegistry = Record<string, PanelDefinition>
