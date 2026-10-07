import type { ComponentType } from 'react'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { Slot } from './layout'

/** Which panel: its registered type and, for items like a project, its id. Fits in the URL */
export type PanelRef = { type: string; id?: string }

export type PanelProps = { id?: string }

/**
 * What a drag carries:
 * - new: a panel from outside the workspace (a sidebar item, PanelDragLink), dropped on an edge
 * - pane: a panel of the workspace (its grip, Pane), dropped on an edge or the centre of another
 */
export type PanelDragData =
  | { kind: 'new'; panel: PanelRef; label: string }
  | { kind: 'pane'; panel: PanelRef; label: string; from: Slot }

/** How one panel type looks and behaves. Registered once per type (see src/panels.ts) */
export type PanelDefinition = {
  title: (id?: string) => string
  icon: PlainIcon
  component: ComponentType<PanelProps>
  /** May be combined with other panels (dragged in, or receive drops) */
  draggable: boolean
  /** Its own page, if it has one: used for "Full page" and when it's the only panel left */
  route?: (id?: string) => string
  /** Route pattern of that page, so the current page can act as a panel (drop target) */
  matchRoute?: string
}

export type PanelRegistry = Record<string, PanelDefinition>
