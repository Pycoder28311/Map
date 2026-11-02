import { pixelThemeClass, type PixelTheme } from './pixelThemes'
import type { ComponentProps } from 'react'
import { paperEdgePolygon } from '../../../features/dashboard/cards/paperEdge'
import { pixelCorners } from './pixelSquare'

/** The rolls' corners: one pixel cut off each */
const ROLL = pixelCorners(1)
/** The aged paper's worn edges: uneven, with a few small bites (the same every time) */
const WORN = paperEdgePolygon('aged-scroll', 4, 3)

type Props = ComponentProps<'div'> & {
  /** The colours (pixelThemes.ts): parchment (default), stone (white-grey) or aged */
  theme?: PixelTheme
  /** `bright` (default): orange paper, black outline. `aged`: old tan paper, worn speckled edges, brown outline */
  look?: 'bright' | 'aged'
}

/**
 * A pixel-art parchment scroll: a strip of paper between two rolled ends, with a hard dark outline round it (styles/parchment.css: its colours
 * and pixel size). Put any text or element in it; it is as wide as what it holds (or as `className` makes it) and as tall as its parent row
 * lets it be. The text in it is the parchment's ink colour.
 *
 *   <ParchmentScroll><span className="px-2">My map</span></ParchmentScroll>
 *   <ParchmentScroll look="aged">…</ParchmentScroll>
 */
export default function ParchmentScroll({ theme, look = 'bright', className = '', children, ...rest }: Props) {
  return (
    <div className={`ui-scroll ${look === 'aged' ? 'ui-scroll-aged' : ''} ${pixelThemeClass(theme)} ${className}`} {...rest}>
      <span aria-hidden className="ui-scroll-roll" style={{ clipPath: ROLL }} />
      <div className="ui-scroll-paper" style={look === 'aged' ? { clipPath: WORN } : undefined}>
        {children}
      </div>
      <span aria-hidden className="ui-scroll-roll" style={{ clipPath: ROLL }} />
    </div>
  )
}
