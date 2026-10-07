import { useMemo } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  addPanel,
  allowedEdges,
  fromSearchParams,
  hasPanel,
  keepOnly,
  MAX_PANELS,
  moveEdges,
  panelAt,
  rearrange,
  removePanel,
  single,
  swapPanels,
  WORKSPACE_PATH,
  workspaceHref,
  type DropSpot,
  type Slot,
  type WorkspaceLayout,
} from './layout'
import { usePanelRegistry } from './registryContext'
import { snapshotPanes } from './paneFlip'
import type { PanelDragData, PanelRef, PanelRegistry } from './types'

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
  /** Shows a new layout; `glide`: the panes glide from where they are to their new places (paneFlip.ts) */
  const go = (next: WorkspaceLayout | null, { glide = true } = {}) => {
    if (glide) snapshotPanes()
    navigate(hrefFor(next, registry))
  }

  return {
    layout,
    onWorkspace,
    count,
    canAdd,
    isOpen: (panel: PanelRef) => layout !== null && hasPanel(layout, panel),
    isDraggable,
    /** Link target for one panel on its own */
    hrefOf: (panel: PanelRef) => hrefFor(single(panel), registry),
    /**
     * Where on a slot the current drag may be dropped:
     * - new panel: the edges that can split, when there's room and both panels may be combined
     * - pane: the edges it can move to (movePanel) and the centre (swap); on its own place only the
     *   centre (back there, the live swap preview goes away; dropping there changes nothing)
     * Slots are places in the layout before the drag: a live swap preview moves panels, not places.
     */
    dropSpots: (slot: Slot, drag: PanelDragData | null): DropSpot[] => {
      const target = layout && panelAt(layout, slot)
      if (!drag || !target) return []
      if (drag.kind === 'pane') return drag.from === slot ? ['center'] : [...moveEdges(layout, drag.from, slot), 'center']
      if (!canAdd || !isDraggable(target) || !isDraggable(drag.panel) || hasPanel(layout, drag.panel)) return []
      return allowedEdges(layout, slot)
    },

    /** Button: next to the current page/panels when both sides may be combined, else on its own */
    open: (panel: PanelRef) => {
      if (layout && hasPanel(layout, panel)) return
      const combine = layout !== null && isDraggable(panel) && layout.panels.every(isDraggable)
      go(addPanel(combine ? layout : null, panel))
    },
    /** A new panel (e.g. a sidebar item) dropped on an edge of a slot (one of dropSpots) */
    dropNew: (panel: PanelRef, slot: Slot, spot: DropSpot) => {
      if (!layout || spot === 'center' || hasPanel(layout, panel) || !isDraggable(panel)) return
      go(addPanel(layout, panel, { slot, edge: spot }))
    },
    /** A pane dropped on a spot of another slot: swapped (centre) or moved (edge). No glide: the
     *  drag's preview already shows the panes there */
    rearrangePane: (from: Slot, target: { slot: Slot; spot: DropSpot }) => {
      const next = layout && rearrange(layout, from, target)
      if (next) go(next, { glide: false })
    },
    /** Swap button on a border: the two panels trade places (layout and sizes stay) */
    swap: (a: Slot, b: Slot) => {
      const next = layout && swapPanels(layout, a, b)
      if (next) go(next)
    },
    detach: (slot: Slot) => layout && go(removePanel(layout, slot)),
    fullPage: (slot: Slot) => layout && go(keepOnly(layout, slot)),
  }
}
