import { memo, Suspense, type ComponentType } from 'react'
import { LuMaximize2, LuUnlink } from 'react-icons/lu'
import IconButton from '../../components/ui/IconButton'
import IconSlot from '../../components/ui/IconSlot'
import DropZones from './DropZones'
import type { Slot } from './layout'
import { usePanelRegistry } from './registryContext'
import type { PanelProps, PanelRef } from './types'
import { useWorkspace } from './useWorkspace'

type Props = {
  /** Position in the grid: a, b, c, d (also its CSS grid-area) */
  slot: Slot
  /** What it shows, e.g. { type: 'project', id: 'p1' } */
  panel: PanelRef
}

/** One panel of the workspace: header (title, Detach, Full page) + the panel's content */
export default function Pane({ slot, panel }: Props) {
  const registry = usePanelRegistry()
  const { count, detach, fullPage, canDropOn } = useWorkspace()
  const def = registry[panel.type]
  const title = def.title(panel.id)

  return (
    <section
      aria-label={title}
      style={{ gridArea: slot }}
      className="relative flex min-h-[50vh] min-w-0 flex-col overflow-hidden rounded-(--card-radius) bg-white shadow-lg lg:min-h-0"
    >
      <header className="flex h-10 shrink-0 items-center gap-(--btn-gap) border-b border-gray-200 px-(--btn-px)">
        <IconSlot icon={def.icon} />
        <h2 className="truncate text-body font-medium">{title}</h2>

        {/* Only meaningful when combined with other panels */}
        {count > 1 && (
          <div className="ml-auto flex shrink-0 gap-1">
            <IconButton icon={LuUnlink} label="Detach" onClick={() => detach(slot)} />
            <IconButton icon={LuMaximize2} label="Full page" onClick={() => fullPage(slot)} />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <PanelContent component={def.component} id={panel.id} />
      </div>

      {/* Drop targets while a draggable sidebar item is dragged (hidden at 4 panels or if not draggable) */}
      <DropZones slot={slot} enabled={canDropOn(slot)} />
    </section>
  )
}

/** The panel's own component; memo so resizing or header changes never re-render it */
const PanelContent = memo(function PanelContent({ component: Content, id }: { component: ComponentType<PanelProps>; id?: string }) {
  return (
    <Suspense fallback={<p className="p-4 text-body text-gray-500">Loading…</p>}>
      <Content id={id} />
    </Suspense>
  )
})
