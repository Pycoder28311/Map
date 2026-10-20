import type { AnyResource } from '../../../resources/types'
import Modal from '../overlays/Modal'
import ResourceEditor from './ResourceEditor'

type Props = {
  resource: AnyResource
  /** The item to edit; null: closed */
  itemId: string | null
  onClose: () => void
}

/** An item of a resource in a modal, like Google Keep: a borderless title and text, and Close. No Save: it saves as you write and when it closes */
export default function ResourceModal({ resource, itemId, onClose }: Props) {
  return (
    <Modal open={itemId !== null} onClose={onClose} title={resource.ui.label} size="md" bare className="bg-note">
      {itemId && <ResourceEditor key={itemId} resource={resource} id={itemId} onClose={onClose} />}
    </Modal>
  )
}
