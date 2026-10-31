import { useImageUrl } from '../../mocks/imageStore'
import Button from '../../components/ui/buttons/Button'
import PinBadge from './PinIconView'
import { PIN_HEIGHT } from './pinIcons'
import PointDescription from './PointDescription'
import { labelName } from './pointLabels'
import type { PointObject } from './types'
import { boardToScreen, type Size, type Viewport } from './viewport'

const WIDTH = 280
/** Room the card needs above the pin before it goes below it instead (px) */
const ROOM = 300
const GAP = 10
/** The hover card: narrower, and it needs less room above the pin */
const HOVER_WIDTH = 240
const HOVER_ROOM = 200

/** `onMore`: the card of a clicked pin, with "Show more". Without it, the card of a hovered pin (like Google Maps'): smaller, it lets
 * the pointer through to the map and goes when the pointer leaves the pin */
type Props = { point: PointObject; view: Viewport; size: Size; onMore?: () => void }

/** The small card above a pin: what a visitor sees first, and what anyone sees while hovering a pin. Below the pin when the top of the page is too close */
export default function PointCard({ point, view, size, onMore }: Props) {
  const banner = useImageUrl(point.banner)
  const top = boardToScreen(view, { x: point.anchor.x, y: point.anchor.y - PIN_HEIGHT })
  const tip = boardToScreen(view, point.anchor)
  const hover = !onMore
  const width = hover ? HOVER_WIDTH : WIDTH
  const above = top.y - GAP >= (hover ? HOVER_ROOM : ROOM)
  const left = Math.max(8, Math.min(top.x - width / 2, size.w - width - 8))
  const style = above ? { left, top: top.y - GAP, width, translate: '0 -100%' } : { left, top: tip.y + GAP, width }
  return (
    <div
      role={hover ? 'tooltip' : 'dialog'}
      aria-label={point.name || 'Point'}
      style={style}
      className={`absolute z-10 flex flex-col overflow-hidden rounded-(--card-radius) border border-line bg-surface shadow-xl ${hover ? 'pointer-events-none max-h-56 animate-share-pop' : 'pointer-events-auto max-h-72'}`}
    >
      {banner && <img src={banner} alt="" className="aspect-[16/7] w-full shrink-0 object-cover" />}
      <div className="flex min-h-0 flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <PinBadge icon={point.icon} color={point.color} className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium">{point.name || 'Untitled point'}</p>
            <p className="text-small text-fg-muted">{labelName(point.label)}</p>
          </div>
        </div>
        <PointDescription text={point.description} className={`${hover ? 'line-clamp-3' : 'line-clamp-4'} overflow-hidden`} />
        {onMore && (
          <Button variant="secondary" onClick={onMore}>
            Show more
          </Button>
        )}
      </div>
    </div>
  )
}
