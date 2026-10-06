import type { ComponentType } from 'react'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'

/** Which panel: its registered type and, for items like a project, its id. Fits in the URL */
export type PanelRef = { type: string; id?: string }

export type PanelProps = { id?: string }

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
