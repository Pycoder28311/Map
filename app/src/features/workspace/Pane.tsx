import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import DropZones from './DropZones'
import { panelKey, type Slot } from './layout'
import PanelContent from './PanelContent'
import PaneIsland from './PaneIsland'
import { paneStyle } from './paneStyles'
import { usePanelRegistry } from './registryContext'
import type { PanelDragData, PanelRef } from './types'
import { useWorkspace } from './useWorkspace'
import { useWorkspaceDrag } from './workspaceDrag'

// Wide screens: placed by its box (stacked below lg)
const PLACED = 'lg:absolute lg:[left:var(--pane-l)] lg:[top:var(--pane-t)] lg:[right:var(--pane-r)] lg:[bottom:var(--pane-b)]'
// The hovered pane's thin outer line turns blue (paneStyles' outline reads --pane-hairline); the thick border stays
const HOVER = 'hover:[--pane-hairline:var(--highlight)]'

type Props = {
  /** Position in the grid: a, b, c, d (also its CSS grid-area) */
  slot: Slot
  /** What it shows, e.g. { type: 'map', id: 'm1' } */
  panel: PanelRef
  /** Where it sits on wide screens: insets from the split lines (layout.ts: paneBoxCss) */
  box: { left: string; top: string; right: string; bottom: string }
}

/**
 * One panel of the workspace: its content, with its actions floating over the top centre (PaneIsland).
 * Dragged by its background or the island's grip (BackgroundPointerSensor: not from its buttons,
 * fields, map…) onto another panel: an edge splits it, the centre swaps the two (usePaneRearrange).
 */
export default function Pane({ slot, panel, box }: Props) {
  const registry = usePanelRegistry()
  const { count, detach, fullPage } = useWorkspace()
  const { dragging } = useWorkspaceDrag()
  const def = registry[panel.type]
  const title = def.title(panel.id)
  const key = panelKey(panel)

  const data: PanelDragData = { kind: 'pane', panel, label: title, from: slot }
  // Pointer: listens on the whole pane. Keyboard: from the grip only (it's the activator node; the
  // keyboard sensor ignores the rest, so typing Space in a field never starts a drag)
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `pane:${key}`, data })
  const setGripRef = (el: HTMLElement | null) => {
    setNodeRef(el)
    setActivatorNodeRef(el)
  }

  return (
    <section
      // For the glide to its new place (paneFlip.ts)
      data-pane={key}
      // An item's pane can be picked to share (features/share): its panel key, e.g. note:5
      data-share-id={panel.id ? panelKey(panel) : undefined}
      aria-label={title}
      {...(count > 1 ? listeners : {})}
      style={{ ...paneStyle, '--pane-l': box.left, '--pane-t': box.top, '--pane-r': box.right, '--pane-b': box.bottom } as CSSProperties}
      // Hovered: a blue thin line (not while something is dragged: the drop previews show then)
      className={`@container relative flex min-h-[50vh] ${PLACED} min-w-0 flex-col overflow-hidden bg-surface shadow-lg transition-[opacity,outline-color] duration-150 lg:min-h-0 ${isDragging ? 'opacity-50' : ''} ${dragging ? '' : HOVER}`}
    >
      <div className={`min-h-0 flex-1 ${def.fill ? 'overflow-hidden' : 'overflow-auto'}`}>
        {def.fill ? (
          <div className="h-full">
            <PanelContent component={def.component} id={panel.id} />
          </div>
        ) : (
          <PanelContent component={def.component} id={panel.id} />
        )}
      </div>

      {/* Only meaningful when combined with other panels */}
      {count > 1 && (
        <PaneIsland
          grip={{ setRef: setGripRef, attributes }}
          onDetach={() => detach(slot)}
          onFullPage={() => fullPage(slot)}
        />
      )}

      {/* Drop targets while a sidebar item or another pane is dragged (useWorkspace's dropSpots) */}
      <DropZones slot={slot} />
    </section>
  )
}
