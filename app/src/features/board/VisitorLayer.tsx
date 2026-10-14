import type { Board } from './types'
import PointCard from './PointCard'
import PointView from './PointView'
import type { Size, Viewport } from './viewport'

type Props = {
  board: Board
  view: Viewport
  size: Size
  /** The pin that was clicked (null: none) */
  openId: number | null
  /** "Show more" was pressed: the whole pin */
  full: boolean
  onMore: () => void
  onClose: () => void
  onShowBoardObject: (id: number) => void
}

/** What a visitor gets over the map: the card of the clicked pin, and after "Show more" its whole view */
export default function VisitorLayer({ board, view, size, openId, full, onMore, onClose, onShowBoardObject }: Props) {
  const point = board.objects.find((o) => o.id === openId)
  if (point?.kind !== 'point') return null
  if (full) return <PointView point={point} board={board.objects} onClose={onClose} onShowBoardObject={(id) => { onClose(); onShowBoardObject(id) }} />
  return <PointCard point={point} view={view} size={size} onMore={onMore} />
}
