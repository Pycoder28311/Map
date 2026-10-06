import { useMemo } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  addPanel,
  allowedEdges,
  fromSearchParams,
  hasPanel,
  keepOnly,
  MAX_PANELS,
  panelAt,
  removePanel,
  single,
  WORKSPACE_PATH,
  workspaceHref,
  type Edge,
  type Slot,
  type WorkspaceLayout,
} from './layout'
import { usePanelRegistry } from './registryContext'
import type { PanelRef, PanelRegistry } from './types'

/** Where a layout lives: its own page for a single routed panel, else /workspace?… */
export function hrefFor(layout: WorkspaceLayout | null, registry: PanelRegistry): string {
  if (!layout) return '/dashboard'
  if (layout.panels.length === 1) {
    const panel = layout.panels[0]
    const route = registry[panel.type]?.route
    if (route) return route(panel.id)
  }
  return workspaceHref(layout)
}

/**
 * The workspace as one model, wherever you are: on /workspace it's read from the URL; on a page that
 * is a registered panel (e.g. /dashboard) that page counts as a 1-panel layout, so dropping onto the
 * current page and onto a panel is the same operation. Changes only navigate: no requests.
 */
export function useWorkspace() {
  const registry = usePanelRegistry()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const onWorkspace = pathname === WORKSPACE_PATH

  const layout = useMemo<WorkspaceLayout | null>(() => {
    if (onWorkspace) return fromSearchParams(new URLSearchParams(search), (type) => type in registry)
    const type = Object.keys(registry).find((t) => {
      const pattern = registry[t].matchRoute
      return pattern !== undefined && matchPath(pattern, pathname) !== null
    })
    return type ? single({ type }) : null
  }, [onWorkspace, pathname, search, registry])

  const count = layout?.panels.length ?? 0
  const canAdd = count < MAX_PANELS
  const isDraggable = (panel: PanelRef) => registry[panel.type]?.draggable ?? false
  const go = (next: WorkspaceLayout | null) => navigate(hrefFor(next, registry))

  return {
    layout,
    onWorkspace,
    count,
    canAdd,
    isOpen: (panel: PanelRef) => layout !== null && hasPanel(layout, panel),
    isDraggable,
    /** Link target for one panel on its own */
    hrefOf: (panel: PanelRef) => hrefFor(single(panel), registry),
    /** A slot accepts drops when there's room and its panel may be combined */
    canDropOn: (slot: Slot) => {
      const panel = layout && panelAt(layout, slot)
      return !!panel && canAdd && isDraggable(panel) && allowedEdges(layout, slot).length > 0
    },

    /** Button: next to the current page/panels when both sides may be combined, else on its own */
    open: (panel: PanelRef) => {
      if (layout && hasPanel(layout, panel)) return
      const combine = layout !== null && isDraggable(panel) && layout.panels.every(isDraggable)
      go(addPanel(combine ? layout : null, panel))
    },
    /** Drag & drop onto an edge of a slot */
    drop: (panel: PanelRef, slot: Slot, edge: Edge) => {
      if (!layout || hasPanel(layout, panel) || !isDraggable(panel)) return
      go(addPanel(layout, panel, { slot, edge }))
    },
    detach: (slot: Slot) => layout && go(removePanel(layout, slot)),
    fullPage: (slot: Slot) => layout && go(keepOnly(layout, slot)),
  }
}
