import { useRef, type CSSProperties } from 'react'
import { Navigate } from 'react-router-dom'
import { gridAreas, panelKey, SLOTS } from './layout'
import Pane from './Pane'
import ResizeHandles from './ResizeHandles'
import { percent, useSplit } from './split'
import { useWorkspace } from './useWorkspace'

// From lg up: a 2×2 grid whose lines sit at --split-x / --split-y (changed live by ResizeHandles).
// Below lg: panels stacked, no resizing.
const GRID =
  'relative h-full gap-(--pane-gap) p-(--pane-gap) max-lg:flex max-lg:flex-col max-lg:overflow-auto ' +
  'lg:grid lg:[grid-template-areas:var(--ws-areas)] lg:[grid-template-columns:var(--ws-cols)] lg:[grid-template-rows:var(--ws-rows)]'

/** The /workspace page: the panels of the URL on a resizable grid */
export default function Workspace() {
  const { layout } = useWorkspace()
  const [split, saveSplit] = useSplit()
  const gridRef = useRef<HTMLDivElement>(null)

  if (!layout) return <Navigate to="/dashboard" replace />

  const vars = {
    '--split-x': percent(split.x),
    '--split-y': percent(split.y),
    '--ws-areas': gridAreas(layout.template),
    // The gap is centred on the line, so each track gives up half of it
    '--ws-cols': 'calc(var(--split-x) - var(--pane-gap) / 2) minmax(0, 1fr)',
    '--ws-rows': 'calc(var(--split-y) - var(--pane-gap) / 2) minmax(0, 1fr)',
  } as CSSProperties

  return (
    <div ref={gridRef} style={vars} className={GRID}>
      {layout.panels.map((panel, i) => (
        <Pane key={panelKey(panel)} slot={SLOTS[i]} panel={panel} />
      ))}
      <ResizeHandles template={layout.template} containerRef={gridRef} split={split} onCommit={saveSplit} />
    </div>
  )
}
