import type { ComponentProps, CSSProperties } from 'react'
import type { PixelTheme } from './pixelThemes'
import { SPRITE_FRAMES, type SpriteFrameName } from './spriteFrames'

/**
 * A theme on a picture: its colours turned by a filter (the picture's own colours are `parchment`). Only the frame's layer is filtered, never what
 * is inside it
 */
const THEME_FILTER: Record<PixelTheme, string | undefined> = {
  parchment: undefined,
  stone: 'grayscale(1) brightness(1.18) contrast(0.95)',
  aged: 'sepia(0.35) saturate(0.85) brightness(0.95)',
  pastel: 'saturate(0.5) brightness(1.14) contrast(0.9)',
  app: 'grayscale(1) brightness(0.3)',
}

type Props = ComponentProps<'div'> & {
  /** Which picture (spriteFrames.ts) */
  sprite: SpriteFrameName
  /** How big one pixel of the drawing is, in CSS px (default 1: the picture at its own size) */
  scale?: number
  /** The colours: the picture's own (parchment, default), or turned to stone (white-grey), aged or pastel (light beige-brown) */
  theme?: PixelTheme
  /** Classes of the inside (its padding, its layout); it starts inside the frame's edges */
  contentClassName?: string
}

/**
 * A pixel-art frame drawn from a picture (spriteFrames.ts): its edges and corners exactly as drawn, its inside repeated to fill, crisp at any
 * size (pixelated). Put any text or element in it; `className` sizes and places it, `contentClassName` lays out what is inside.
 *
 *   <SpriteFrame sprite="parchment-scroll" contentClassName="px-2">My map</SpriteFrame>
 *   <SpriteFrame sprite="parchment-scroll" scale={2} theme="stone">…</SpriteFrame>
 */
export default function SpriteFrame({ sprite, scale = 1, theme = 'parchment', className = '', contentClassName = '', style, children, ...rest }: Props) {
  const { src, slice } = SPRITE_FRAMES[sprite]
  const edge = (n: number) => `${n * scale}px`
  const layer: CSSProperties = {
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: `${edge(slice.top)} ${edge(slice.right)} ${edge(slice.bottom)} ${edge(slice.left)}`,
    borderImage: `url(${src}) ${slice.top} ${slice.right} ${slice.bottom} ${slice.left} fill / ${edge(slice.top)} ${edge(slice.right)} ${edge(slice.bottom)} ${edge(slice.left)} round`,
    imageRendering: 'pixelated',
    filter: THEME_FILTER[theme],
  }
  return (
    <div className={`relative isolate ${className}`} style={style} {...rest}>
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={layer} />
      <div className={`relative h-full ${contentClassName}`} style={{ padding: `${edge(slice.top)} ${edge(slice.right)} ${edge(slice.bottom)} ${edge(slice.left)}` }}>
        {children}
      </div>
    </div>
  )
}
