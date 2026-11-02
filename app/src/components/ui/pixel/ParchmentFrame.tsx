import { pixelThemeClass, type PixelTheme } from './pixelThemes'
import type { ComponentProps, CSSProperties } from 'react'

/** One pixel of the drawing (styles/parchment.css, --frame-u) */
const U = 'var(--frame-u)'
const px = (k: number) => `calc(${k} * ${U})`
const fromEnd = (k: number) => `calc(100% - ${k} * ${U})`

/**
 * The sheet's outline: pixel corners (two steps) and a small cut, two pixels wide and one deep, here and there in each edge (at % along it),
 * as the frames of old pixel-art parchment have
 */
function sheetClip(): string {
  const p: string[] = []
  // Top, left to right
  p.push(`0 ${px(2)}`, `${px(1)} ${px(2)}`, `${px(1)} ${px(1)}`, `${px(2)} ${px(1)}`, `${px(2)} 0`)
  for (const t of [28, 64]) p.push(`${t}% 0`, `${t}% ${px(1)}`, `calc(${t}% + ${px(2)}) ${px(1)}`, `calc(${t}% + ${px(2)}) 0`)
  p.push(`${fromEnd(2)} 0`, `${fromEnd(2)} ${px(1)}`, `${fromEnd(1)} ${px(1)}`, `${fromEnd(1)} ${px(2)}`, `100% ${px(2)}`)
  // Right, top to bottom
  for (const t of [55]) p.push(`100% ${t}%`, `${fromEnd(1)} ${t}%`, `${fromEnd(1)} calc(${t}% + ${px(2)})`, `100% calc(${t}% + ${px(2)})`)
  p.push(`100% ${fromEnd(2)}`, `${fromEnd(1)} ${fromEnd(2)}`, `${fromEnd(1)} ${fromEnd(1)}`, `${fromEnd(2)} ${fromEnd(1)}`, `${fromEnd(2)} 100%`)
  // Bottom, right to left
  for (const t of [70, 36]) p.push(`calc(${t}% + ${px(2)}) 100%`, `calc(${t}% + ${px(2)}) ${fromEnd(1)}`, `${t}% ${fromEnd(1)}`, `${t}% 100%`)
  p.push(`${px(2)} 100%`, `${px(2)} ${fromEnd(1)}`, `${px(1)} ${fromEnd(1)}`, `${px(1)} ${fromEnd(2)}`, `0 ${fromEnd(2)}`)
  // Left, bottom to top
  for (const t of [40]) p.push(`0 calc(${t}% + ${px(2)})`, `${px(1)} calc(${t}% + ${px(2)})`, `${px(1)} ${t}%`, `0 ${t}%`)
  return `polygon(${p.join(', ')})`
}

const SHEET = sheetClip()

/** The four corners' dotted brackets: the top left one, turned for the others */
const CORNERS: CSSProperties[] = [
  { top: px(4), left: px(4) },
  { top: px(4), right: px(4), transform: 'scaleX(-1)' },
  { bottom: px(4), right: px(4), transform: 'scale(-1, -1)' },
  { bottom: px(4), left: px(4), transform: 'scaleY(-1)' },
]

type Props = ComponentProps<'div'> & {
  /** The colours (pixelThemes.ts): parchment (default), stone (white-grey) or aged */
  theme?: PixelTheme
  /** Classes of the sheet itself (its padding, its layout) */
  sheetClassName?: string
}

/**
 * A pixel-art parchment frame: a sheet of peach paper with pixel corners and small cuts in its edges, a dark outline, bands inside its edge and
 * dotted brackets in its corners (styles/parchment.css: its colours and pixel size). Put any text or element in it; `className` sizes and places it,
 * `sheetClassName` lays out what is inside.
 *
 *   <ParchmentFrame sheetClassName="px-3 py-2">My map</ParchmentFrame>
 */
export default function ParchmentFrame({ theme, className = '', sheetClassName = '', children, ...rest }: Props) {
  return (
    <div className={`ui-frame ${pixelThemeClass(theme)} ${className}`} {...rest}>
      <div className={`ui-frame-sheet h-full ${sheetClassName}`} style={{ clipPath: SHEET }}>
        {CORNERS.map((style, i) => (
          <span key={i} aria-hidden className="ui-frame-corner" style={style} />
        ))}
        {children}
      </div>
    </div>
  )
}
