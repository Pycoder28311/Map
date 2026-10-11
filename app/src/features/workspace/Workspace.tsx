import { useRef, type CSSProperties } from 'react'
import { Navigate } from 'react-router-dom'
import { paneBoxCss, panelKey, SLOTS, splitFor, workspaceHref } from './layout'
import Pane from './Pane'
import PanelPage from './PanelPage'
import { usePaneFlip } from './paneFlip'
import { PANE_GAP, paneGridStyle, workspaceFrameStyle } from './paneStyles'
import ResizeHandles from './ResizeHandles'
import SwapButtons from './SwapButtons'
import { percent, useSplit } from './split'
import { usePaneRearrange } from './usePaneRearrange'
import { useWorkspace } from './useWorkspace'

// From lg up: the panes are boxes placed from the split lines (--split-x / --split-y, and in a 2×2
// layout --split-x2 / --split-y2 for a line whose halves differ), changed live by ResizeHandles.
// Below lg: panels stacked, no resizing; the scroll area is rounded like the panes and clips to it,
// so a pane cut off by the scroll still shows rounded corners. The area has no padding of its own
// (the frame around it does), so the handles' percentages and the panes' boxes line up exactly.
const GRID = 'relative h-full max-lg:flex max-lg:flex-col max-lg:overflow-auto max-lg:rounded-(--pane-radius)'

/**
 * The /workspace page. One panel: a normal page (PanelPage). Two or more: panes on a resizable grid,
 * inside a rounded frame whose corners continue the navbar and sidebar.
 */
export default function Workspace() {
  const { layout: saved, swap } = useWorkspace()
  const [storedSplit, saveSplit] = useSplit()
  const gridRef = useRef<HTMLDivElement>(null)
  // While a pane is dragged, the panes are shown as if it were dropped where the pointer is
  const { preview } = usePaneRearrange(gridRef, saved, splitFor(saved?.template ?? '1', storedSplit))
  const layout = preview ?? saved
  // Halves only apply to a 2×2 layout (layout.ts: splitFor)
  const split = splitFor(layout?.template ?? '1', storedSplit)
  // Panes glide to their new places when the layout (or its preview) changes
  usePaneFlip(gridRef, layout ? workspaceHref(layout) : '')

  if (!layout) return <Navigate to="/dashboard" replace />
  if (layout.panels.length === 1) return <PanelPage panel={layout.panels[0]} />

  const vars = {
    '--split-x': percent(split.x),
    '--split-y': percent(split.y),
    // Only when a line's halves differ; otherwise the panes fall back to the whole line
    ...(split.x2 !== undefined ? { '--split-x2': percent(split.x2) } : {}),
    ...(split.y2 !== undefined ? { '--split-y2': percent(split.y2) } : {}),
  } as CSSProperties

  return (
    // The bars' colour, seen around the frame's rounded corners
    <div className="h-full bg-surface">
      <div style={workspaceFrameStyle} className="h-full bg-surface-muted">
        <div ref={gridRef} style={{ ...paneGridStyle, ...vars }} className={GRID}>
          {layout.panels.map((panel, i) => (
            <Pane key={panelKey(panel)} slot={SLOTS[i]} panel={panel} box={paneBoxCss(layout.template, SLOTS[i], PANE_GAP)} />
          ))}
          <ResizeHandles template={layout.template} containerRef={gridRef} split={split} onCommit={saveSplit} />
          {/* After the lines: they show it on hover (peer) */}
          <SwapButtons template={layout.template} onSwap={swap} containerRef={gridRef} split={split} onCommit={saveSplit} />
        </div>
      </div>
    </div>
  )
}
