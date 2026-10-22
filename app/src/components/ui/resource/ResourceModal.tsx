import { useEffect } from 'react'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import { dropFocus, isNewId, peekFocus } from '../../../lib/resource/newItem'
import type { AnyResource } from '../../../resources/types'
import Modal from '../overlays/Modal'
import NewItemEditor from './NewItemEditor'
import ResourceEditor from './ResourceEditor'

type Props = {
  resource: AnyResource
  /** The item to edit; `new`: an empty form that makes the item when something is typed; null: closed */
  itemId: string | null
  onClose: () => void
  /** For `new`: the item was made, show it under its id (the caller sets `itemId`) */
  onMade?: (id: string) => void
}

/**
 * An item of a resource in a centred modal, like Google Keep: its fields, a zoom button (left of the X) to the item's own page (a new pane
 * when there are panes), and the X. No Save: it saves as you write and when it closes
 */
export default function ResourceModal({ resource, itemId, onClose, onMade }: Props) {
  const workspace = useWorkspace()
  const isNew = itemId !== null && isNewId(itemId)
  // The cursor goes back where it was when a new item was made
  useEffect(() => {
    if (itemId) dropFocus(resource.name, itemId)
  }, [resource.name, itemId])
  const panel = itemId && !isNew ? { type: resource.panelType, id: itemId } : undefined
  // With panes on screen (two or more) and room for one more, the zoom adds the item as a new pane; else it is the item's page
  const asPane = panel && workspace.onWorkspace && workspace.count >= 2 && workspace.canAdd ? () => workspace.open(panel) : undefined
  return (
    <Modal
      open={itemId !== null}
      onClose={onClose}
      title={isNew ? `New ${resource.ui.label.toLowerCase()}` : resource.ui.label}
      size="md"
      flush
      zoomable={!isNew}
      pageHref={panel ? workspace.hrefOf(panel) : undefined}
      onZoom={asPane}
      className="bg-note"
    >
      {itemId &&
        (isNew ? (
          <NewItemEditor resource={resource} onMade={onMade} />
        ) : (
          <ResourceEditor key={itemId} resource={resource} id={itemId} onClose={onClose} focusField={peekFocus(resource.name, itemId)} showClose={false} />
        ))}
    </Modal>
  )
}
