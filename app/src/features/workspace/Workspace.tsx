import { useRef, type CSSProperties } from 'react'
import { Navigate } from 'react-router-dom'
import { gridAreas, panelKey, SLOTS, workspaceHref } from './layout'
import Pane from './Pane'
import PanelPage from './PanelPage'
import { usePaneFlip } from './paneFlip'
import { PANE_GAP, paneGridStyle, workspaceFrameStyle } from './paneStyles'
import ResizeHandles from './ResizeHandles'
import SwapButtons from './SwapButtons'
import { percent, useSplit } from './split'
import { usePaneRearrange } from './usePaneRearrange'
import { useWorkspace } from './useWorkspace'

// From lg up: a 2×2 grid whose lines sit at --split-x / --split-y (changed live by ResizeHandles).
// Below lg: panels stacked, no resizing. The grid has no padding of its own (the frame around it
// does), so the handles' percentages and the grid's line up exactly.
const GRID =
  'relative h-full max-lg:flex max-lg:flex-col max-lg:overflow-auto ' +
  'lg:grid lg:[grid-template-areas:var(--ws-areas)] lg:[grid-template-columns:var(--ws-cols)] lg:[grid-template-rows:var(--ws-rows)]'

/**
 * The /workspace page. One panel: a normal page (PanelPage). Two or more: panes on a resizable grid,
 * inside a rounded frame whose corners continue the navbar and sidebar.
 */
export default function Workspace() {
  const { layout: saved, swap } = useWorkspace()
  const [split, saveSplit] = useSplit()
  const gridRef = useRef<HTMLDivElement>(null)
  // While a pane is dragged, the panes are shown as if it were dropped where the pointer is
  const { preview } = usePaneRearrange(gridRef, saved, split)
  const layout = preview ?? saved
  // Panes glide to their new places when the layout (or its preview) changes
  usePaneFlip(gridRef, layout ? workspaceHref(layout) : '')

  if (!layout) return <Navigate to="/dashboard" replace />
  if (layout.panels.length === 1) return <PanelPage panel={layout.panels[0]} />

  const vars = {
    '--split-x': percent(split.x),
    '--split-y': percent(split.y),
    '--ws-areas': gridAreas(layout.template),
    // The gap is centred on the line, so each track gives up half of it
    '--ws-cols': `calc(var(--split-x) - ${PANE_GAP / 2}px) minmax(0, 1fr)`,
    '--ws-rows': `calc(var(--split-y) - ${PANE_GAP / 2}px) minmax(0, 1fr)`,
  } as CSSProperties

  return (
    // The bars' colour, seen around the frame's rounded corners
    <div className="h-full bg-surface">
      <div style={workspaceFrameStyle} className="h-full bg-surface-muted">
        <div ref={gridRef} style={{ ...paneGridStyle, ...vars }} className={GRID}>
          {layout.panels.map((panel, i) => (
            <Pane key={panelKey(panel)} slot={SLOTS[i]} panel={panel} />
          ))}
          <ResizeHandles template={layout.template} containerRef={gridRef} split={split} onCommit={saveSplit} />
          {/* After the lines: they show it on hover (peer) */}
          <SwapButtons template={layout.template} onSwap={swap} />
        </div>
      </div>
    </div>
  )
}
