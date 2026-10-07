import { useDraggable } from '@dnd-kit/core'
import DropZones from './DropZones'
import { panelKey, type Slot } from './layout'
import PanelContent from './PanelContent'
import PaneIsland from './PaneIsland'
import { paneStyle } from './paneStyles'
import { usePanelRegistry } from './registryContext'
import type { PanelDragData, PanelRef } from './types'
import { useWorkspace } from './useWorkspace'

type Props = {
  /** Position in the grid: a, b, c, d (also its CSS grid-area) */
  slot: Slot
  /** What it shows, e.g. { type: 'project', id: 'p1' } */
  panel: PanelRef
}

/**
 * One panel of the workspace: its content, with its actions floating over the top centre (PaneIsland).
 * Dragged by its background or the island's grip (BackgroundPointerSensor: not from its buttons,
 * fields, map…) onto another panel: an edge splits it, the centre swaps the two (usePaneRearrange).
 */
export default function Pane({ slot, panel }: Props) {
  const registry = usePanelRegistry()
  const { count, detach, fullPage } = useWorkspace()
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
      aria-label={title}
      {...(count > 1 ? listeners : {})}
      style={{ ...paneStyle, gridArea: slot }}
      className={`relative flex min-h-[50vh] min-w-0 flex-col overflow-hidden bg-surface shadow-lg transition-opacity lg:min-h-0 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <PanelContent component={def.component} id={panel.id} />
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
