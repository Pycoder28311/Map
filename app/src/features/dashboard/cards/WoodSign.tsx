import type { CSSProperties } from 'react'
import { pixelCorners } from '../../../components/ui/pixel/pixelSquare'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import { FRAME, FRAME_PIXEL } from './mapFrame'

/** One pixel of the sign (px): the frame's, so it is drawn in the same pixels */
const U = FRAME_PIXEL

/**
 * A map card's name on a little wooden plank in pixel art, in the frame's wood (mapFrame.ts): a dark outline with its corners cut by a
 * pixel, five rows of wood (a light top row, grain streaks across the middle, a dark bottom row), a nail at each end, the name in the
 * pixel font, bone-pale with a dark shadow. As wide as its name (up to its `className`'s max width); it hangs where the card puts it.
 * It carries `data-card-title-box` and its name `data-card-title`, like every card's title.
 */
export default function WoodSign({ title, icon: Icon, className = '' }: { title: string; icon: PlainIcon; className?: string }) {
  const outline: CSSProperties = { padding: U, backgroundColor: FRAME.outline, clipPath: pixelCorners(1), ['--pixel-square' as string]: `${U}px` }
  const wood: CSSProperties = {
    height: 5 * U,
    gap: 2 * U,
    paddingInline: U,
    backgroundColor: FRAME.wood,
    // grain: streaks along the plank on its middle rows, of different lengths and spacings so they do not line up
    backgroundImage: [
      `linear-gradient(90deg, ${FRAME.grainDark} 0 ${5 * U}px, transparent ${5 * U}px)`,
      `linear-gradient(90deg, ${FRAME.grainLight} 0 ${3 * U}px, transparent ${3 * U}px)`,
      `linear-gradient(90deg, ${FRAME.grainDark} 0 ${2 * U}px, transparent ${2 * U}px)`,
    ].join(', '),
    backgroundSize: `${14 * U}px ${U}px, ${11 * U}px ${U}px, ${9 * U}px ${U}px`,
    backgroundPosition: `${2 * U}px ${2 * U}px, ${7 * U}px ${U}px, ${4 * U}px ${3 * U}px`,
    backgroundRepeat: 'repeat-x',
    boxShadow: `inset 0 ${U}px 0 ${FRAME.grainLight}, inset 0 -${U}px 0 ${FRAME.joint}`,
  }
  const nail: CSSProperties = { width: 2 * U, height: 2 * U, backgroundColor: FRAME.nail, boxShadow: `inset ${U}px ${U}px 0 ${FRAME.nailLight}`, flex: 'none' }
  return (
    <div data-card-title-box className={`min-w-0 ${className}`} style={outline}>
      <div className="flex min-w-0 items-center" style={wood}>
        <span aria-hidden style={nail} />
        <span aria-hidden className="flex shrink-0" style={{ color: FRAME.paperLight }}>
          <Icon className="size-3.5" />
        </span>
        <span
          data-card-title
          className="min-w-0 truncate font-(family-name:--font-pixel) text-[13px] leading-none font-medium"
          style={{ color: FRAME.paperLight, textShadow: `0 ${U / 1.5}px 0 #000` }}
        >
          {title}
        </span>
        <span aria-hidden style={nail} />
      </div>
    </div>
  )
}
