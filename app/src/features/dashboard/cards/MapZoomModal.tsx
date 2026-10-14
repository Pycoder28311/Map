import Modal from '../../../components/ui/overlays/Modal'
import type { MockObject } from '../../../mocks/projects'
import MapPreview from './MapPreview'

type Props = {
  object: MockObject
  open: boolean
  onClose: () => void
}

/** The map's picture, large, without opening the map's page */
export default function MapZoomModal({ object, open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={object.name} size="lg">
      <MapPreview id={object.id} pin="size-16" className="aspect-video w-full rounded-(--btn-radius)" />
    </Modal>
  )
}
