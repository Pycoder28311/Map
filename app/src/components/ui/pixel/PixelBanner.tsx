import { pixelThemeClass, type PixelTheme } from './pixelThemes'
import type { ComponentProps } from 'react'

/** One pixel of the drawing (styles/parchment.css, --scroll-u) */
const U = 'var(--scroll-u)'

export type BannerTail = 'point' | 'swallow' | 'flat'
export type BannerRod = 'plain' | 'knobs' | 'none'

/**
 * The cloth's outline: the sides straight down, the bottom a `point` (down to the middle), a `swallow`tail (cut up to the middle) or `flat`,
 * the slanted edges in pixel steps (`depth` pixels tall, one step per pixel). Pure.
 */
export function bannerClip(tail: BannerTail, depth: number): string {
  if (tail === 'flat' || depth <= 0) return 'none'
  const n = Math.max(1, Math.round(depth))
  const y = (k: number) => `calc(100% - ${n - k} * ${U})` // k steps down from where the tail starts
  const x = (k: number, fromRight: boolean) => (fromRight ? `calc(100% - ${k} * 50% / ${n})` : `calc(${k} * 50% / ${n})`)
  const right: string[] = []
  const left: string[] = []
  if (tail === 'point') {
    // From the right side down to the point, then up to the left side: a staircase each way
    for (let k = 0; k < n; k++) right.push(`${x(k, true)} ${y(k)}`, `${x(k, true)} ${y(k + 1)}`)
    for (let k = n - 1; k >= 0; k--) left.push(`${x(k, false)} ${y(k + 1)}`, `${x(k, false)} ${y(k)}`)
    return `polygon(0 0, 100% 0, ${right.join(', ')}, 50% 100%, ${left.join(', ')})`
  }
  // Swallowtail: the corners go all the way down; the cut climbs from them to the middle
  const up = (k: number) => `calc(100% - ${k} * ${U})`
  for (let k = 0; k < n; k++) right.push(`${x(k, true)} ${up(k)}`, `${x(k + 1, true)} ${up(k)}`)
  for (let k = n - 1; k >= 0; k--) left.push(`${x(k + 1, false)} ${up(k)}`, `${x(k, false)} ${up(k)}`)
  return `polygon(0 0, 100% 0, 100% 100%, ${right.join(', ')}, 50% ${up(n)}, ${left.join(', ')}, 0 100%)`
}

type Props = ComponentProps<'div'> & {
  /** The colours (pixelThemes.ts): parchment (default), stone (white-grey) or aged */
  theme?: PixelTheme
  /** The bottom: a point (default), a swallowtail, or straight */
  tail?: BannerTail
  /** How tall the tail is, in pixels of the drawing (default 12) */
  tailDepth?: number
  /** The rod across the top: plain (default), with red knobs at its ends, or none */
  rod?: BannerRod
  /** Classes of the cloth's inside (its padding, its layout); the tail's height is added under it */
  contentClassName?: string
}

/**
 * A pixel-art banner hanging from a rod (styles/parchment.css: the bright scroll's colours, a black outline round it all): a darker band with a
 * row of dots under the rod, the cloth lighter at its left edge and darker at its right, its bottom a point, a swallowtail or straight. Put any
 * text or element in it; `className` sizes and places it, `contentClassName` lays out what is inside.
 *
 *   <PixelBanner className="w-24" contentClassName="px-2 pt-4">Quests</PixelBanner>
 *   <PixelBanner tail="swallow" rod="knobs">…</PixelBanner>
 */
export default function PixelBanner({ theme, tail = 'point', tailDepth = 12, rod = 'plain', className = '', contentClassName = '', children, ...rest }: Props) {
  const clip = bannerClip(tail, tailDepth)
  return (
    <div className={`ui-banner ${pixelThemeClass(theme)} ${className}`} {...rest}>
      {rod !== 'none' && (
        <span aria-hidden className="ui-banner-rod">
          {rod === 'knobs' && (
            <>
              <span className="ui-banner-knob start-0" />
              <span className="ui-banner-knob end-0" />
            </>
          )}
        </span>
      )}
      <div className="ui-banner-cloth" style={clip === 'none' ? undefined : { clipPath: clip }}>
        <div className={contentClassName} style={{ paddingBottom: tail === 'flat' ? undefined : `calc(${tailDepth} * ${U})` }}>
          {children}
        </div>
      </div>
    </div>
  )
}
