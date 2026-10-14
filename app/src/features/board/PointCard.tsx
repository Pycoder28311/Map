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

type Props = { point: PointObject; view: Viewport; size: Size; onMore: () => void }

/** The small card above a pin: what a visitor sees first. Below the pin when the top of the page is too close */
export default function PointCard({ point, view, size, onMore }: Props) {
  const banner = useImageUrl(point.banner)
  const top = boardToScreen(view, { x: point.anchor.x, y: point.anchor.y - PIN_HEIGHT })
  const tip = boardToScreen(view, point.anchor)
  const above = top.y - GAP >= ROOM
  const left = Math.max(8, Math.min(top.x - WIDTH / 2, size.w - WIDTH - 8))
  const style = above ? { left, top: top.y - GAP, width: WIDTH, translate: '0 -100%' } : { left, top: tip.y + GAP, width: WIDTH }
  return (
    <div role="dialog" aria-label={point.name || 'Point'} style={style} className="pointer-events-auto absolute z-10 flex max-h-72 flex-col overflow-hidden rounded-(--card-radius) border border-line bg-surface shadow-xl">
      {banner && <img src={banner} alt="" className="aspect-[16/7] w-full shrink-0 object-cover" />}
      <div className="flex min-h-0 flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <PinBadge icon={point.icon} color={point.color} className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium">{point.name || 'Untitled point'}</p>
            <p className="text-small text-fg-muted">{labelName(point.label)}</p>
          </div>
        </div>
        <PointDescription text={point.description} className="line-clamp-4 overflow-hidden" />
        <Button variant="secondary" onClick={onMore}>
          Show more
        </Button>
      </div>
    </div>
  )
}
