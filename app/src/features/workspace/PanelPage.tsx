import DropZones from './DropZones'
import PanelContent from './PanelContent'
import { usePanelRegistry } from './registryContext'
import type { PanelRef } from './types'

/**
 * One panel alone (e.g. a project opened from the sidebar): shown like a normal page, filling the
 * content area with no frame, header or rounded corners. Still a drop target, so dragging another
 * item onto it combines the two into panes.
 */
export default function PanelPage({ panel }: { panel: PanelRef }) {
  const registry = usePanelRegistry()

  return (
    <div className="relative min-h-full">
      <PanelContent component={registry[panel.type].component} id={panel.id} />
      <DropZones slot="a" />
    </div>
  )
}
