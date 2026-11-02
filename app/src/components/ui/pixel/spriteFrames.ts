// The pixel-art frames drawn from a picture (SpriteFrame.tsx): each is a small PNG at one pixel per pixel of the drawing, and how many of its
// pixels along each edge are the frame (the rest is the inside, repeated to fill). The picture is stretched by CSS border-image, so any size works
// and the texture stays the drawing's own.
import parchmentScroll from '../../../assets/pixel/parchment-scroll.png'
import parchmentScrollSimple from '../../../assets/pixel/parchment-scroll-simple.png'

export type SpriteSlice = { top: number; right: number; bottom: number; left: number }

export const SPRITE_FRAMES = {
  /** The aged paper between two rolled ends, from a pixel-art parchment set (115×44) */
  'parchment-scroll': { src: parchmentScroll, slice: { top: 5, right: 7, bottom: 5, left: 7 } },
  /** The same, plain: clean pixel edges, no speckles, simple two-tone rolls (40×24) */
  'parchment-scroll-simple': { src: parchmentScrollSimple, slice: { top: 4, right: 6, bottom: 4, left: 6 } },
} as const satisfies Record<string, { src: string; slice: SpriteSlice }>

export type SpriteFrameName = keyof typeof SPRITE_FRAMES
