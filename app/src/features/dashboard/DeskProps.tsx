import type { CSSProperties } from 'react'
import { BACKDROP_PIXEL, SKY_RATIO } from './nightBackdrop'
import { DESK_PALETTE, DESK_SPRITES, type DeskSpriteName } from './deskProps'

/** Half the width of what each prop sits beside (rem): the note input and the Create buttons, or the rows of cards under them. A prop
 *  sits just outside it, or at the page's edge if the page is narrow */
const HALF = { input: 27, cards: 32.5 } as const
/** How far the props stay from that middle (px) */
const GAP = 48
/** How strongly they show: faint, so they stay in the background like things in the dark at the desk's edges */
const OPACITY = 0.45

type Prop = {
  name: DeskSpriteName
  side: 'left' | 'right'
  /** what it sits beside (HALF) */
  beside: keyof typeof HALF
  /** px down from where the sky picture ends (the table, below the horizon) */
  top: number
  /** px past the page's edge it may go (it is cut there): the map's corner peeks in from off the desk */
  past?: number
  /** a candle's own small glow round its flame */
  glow?: boolean
}

// Where each lies on the table: the candle and the compass beside the Create buttons, the inkwell and the scroll beside the first row of
// cards, lower down the map's corner on the left and a sundial on the right, each half off the page
const PROPS: Prop[] = [
  { name: 'candle', side: 'left', beside: 'input', top: -110, glow: true },
  { name: 'compass', side: 'right', beside: 'input', top: -60 },
  { name: 'inkwell', side: 'left', beside: 'cards', top: 300 },
  { name: 'scroll', side: 'right', beside: 'cards', top: 230 },
  { name: 'map', side: 'left', beside: 'cards', top: 470, past: 110 },
  { name: 'sundial', side: 'right', beside: 'cards', top: 520, past: 30 },
]

/** One prop as an SVG, its pixels crisp, with a hard pixel shadow on the table down and to its right */
function Sprite({ name }: { name: DeskSpriteName }) {
  const rows = DESK_SPRITES[name]
  const w = rows[0].length
  const h = rows.length
  const rects: { x: number; y: number; width: number; color: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const letter = row[x]
      let end = x
      while (end + 1 < row.length && row[end + 1] === letter) end++
      if (DESK_PALETTE[letter]) rects.push({ x, y, width: end - x + 1, color: DESK_PALETTE[letter] })
      x = end + 1
    }
  })
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * BACKDROP_PIXEL}
      height={h * BACKDROP_PIXEL}
      shapeRendering="crispEdges"
      style={{ filter: `drop-shadow(${BACKDROP_PIXEL * 2}px ${BACKDROP_PIXEL * 2}px 0 rgb(0 0 0 / 0.35))`, overflow: 'visible' }}
    >
      {rects.map((r) => (
        <rect key={`${r.x}:${r.y}`} x={r.x} y={r.y} width={r.width} height={1} fill={r.color} />
      ))}
    </svg>
  )
}

/**
 * Things lying on the Dashboard's desk in its margins (deskProps.ts): a candle with its own small glow, a brass compass, an inkwell with a
 * quill, a rolled scroll, and the corner of an old map and a bronze sundial coming in from off the page. Behind the content and faint; only on wide
 * screens (lg; those beside the cards 2xl), where there is room beside the middle; the page (NightBackdrop) cuts what goes past its edges. Part of NightBackdrop (LOOK 'desk').
 */
export default function DeskProps() {
  return (
    // As wide as the page and as tall as the sky picture (NightBackdrop), so the props' `top` is measured from where the table begins
    <div className="absolute inset-x-0 top-0 hidden lg:block" style={{ aspectRatio: String(SKY_RATIO), opacity: OPACITY }}>
      {PROPS.map(({ name, side, beside, top, past = 0, glow }) => {
        const width = DESK_SPRITES[name][0].length * BACKDROP_PIXEL
        const edge = past ? `${-past}px` : `max(12px, calc(50% - ${HALF[beside]}rem - ${GAP + width}px))`
        const style: CSSProperties = { top: `calc(100% + ${top}px)`, [side]: edge }
        return (
          // the ones beside the cards only on very wide screens (2xl): on narrower ones the cards would cover them
          <div key={name} className={`absolute ${beside === 'cards' ? 'hidden 2xl:block' : ''}`} style={style}>
            {glow && (
              <div
                className="absolute"
                style={{
                  left: width / 2 - 160,
                  top: 3 * BACKDROP_PIXEL - 160,
                  width: 320,
                  height: 320,
                  backgroundImage: 'radial-gradient(circle, rgb(255 190 100 / 0.22), rgb(255 170 80 / 0.07) 40%, transparent 70%)',
                }}
              />
            )}
            <div className="relative">
              <Sprite name={name} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
