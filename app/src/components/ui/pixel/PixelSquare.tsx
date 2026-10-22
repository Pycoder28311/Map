import type { ComponentProps, ElementType } from 'react'
import { pixelSquare } from './pixelSquare'

type Props = ComponentProps<'button'> & {
  /** What it is (default: a div); a button keeps its own disabled state, which turns the bevel's pressed look off */
  as?: 'div' | 'span' | 'button'
  /** A bevel inside it: a lighter edge along the top and left, a darker one of the same size along the bottom and right (default: none) */
  bevel?: boolean
  /** How many steps each corner has, each one pixel unit (--pixel-square, tokens.css) across and down (default 2; 0: square corners) */
  steps?: number
}

/**
 * A box with pixelised corners and, with `bevel`, a pixelised shadow inside it, like Minecraft's buttons. Its colour is
 * `--pixel-face` (e.g. `[--pixel-face:var(--create)]`: set it, not a bg-* class, as the bevel's edges are lighter and darker shades of it); size
 * and the rest come from `className`; a `focus-visible` outline should be drawn inside it (outline-offset negative), as the corners clip
 * what is outside.
 */
export default function PixelSquare({ as = 'div', bevel = false, steps, className = '', style, ...rest }: Props) {
  const Tag = as as ElementType
  const pixels = pixelSquare({ bevel, steps })
  return <Tag className={`${pixels.className} ${className}`} style={{ ...pixels.style, ...style }} {...rest} />
}
