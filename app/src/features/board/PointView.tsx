import { LuX } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import Modal from '../../components/ui/overlays/Modal'
import { useImageUrl } from '../../mocks/imageStore'
import PinBadge from './PinIconView'
import PointDescription from './PointDescription'
import PointLinks from './PointLinks'
import { labelName } from './pointLabels'
import type { BoardObject, PointObject } from './types'

type Props = {
  point: PointObject
  board: BoardObject[]
  onClose: () => void
  onShowBoardObject: (id: number) => void
}

/** The whole of a pin, to read: what a visitor sees after "Show more" */
export default function PointView({ point, board, onClose, onShowBoardObject }: Props) {
  const banner = useImageUrl(point.banner)
  return (
    <Modal open onClose={onClose} title={point.name || 'Point'} size="md" bare>
      <div className="flex max-h-[calc(100vh-4rem)] flex-col overflow-y-auto">
        {banner && <img src={banner} alt="" className="aspect-[16/7] w-full object-cover" />}
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <PinBadge icon={point.icon} color={point.color} className="size-12" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-heading">{point.name || 'Untitled point'}</h2>
              <span className="text-small text-fg-muted">{labelName(point.label)}</span>
            </div>
            <IconButton icon={LuX} label="Close" onClick={onClose} data-autofocus />
          </div>
          <PointDescription text={point.description} />
          <PointLinks links={point.links} board={board} onShowBoardObject={onShowBoardObject} />
        </div>
      </div>
    </Modal>
  )
}
