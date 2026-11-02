import { pixelThemeClass, type PixelTheme } from './pixelThemes'
import type { ComponentProps } from 'react'

/** One pixel of the drawing (styles/parchment.css, --scroll-u) */
const U = 'var(--scroll-u)'
const px = (k: number) => `calc(${k} * ${U})`

/**
 * The paper's outline: a rectangle with a small cut (two pixels wide, one deep) in its top edge at each of `top` and in its bottom edge at each
 * of `bottom` (% along the edge). Pure.
 */
export function signClip(top: number[], bottom: number[]): string {
  if (top.length === 0 && bottom.length === 0) return 'none'
  const p = ['0 0']
  for (const t of [...top].sort((a, b) => a - b)) p.push(`${t}% 0`, `${t}% ${px(1)}`, `calc(${t}% + ${px(2)}) ${px(1)}`, `calc(${t}% + ${px(2)}) 0`)
  p.push('100% 0', '100% 100%')
  for (const t of [...bottom].sort((a, b) => b - a))
    p.push(`calc(${t}% + ${px(2)}) 100%`, `calc(${t}% + ${px(2)}) calc(100% - ${px(1)})`, `${t}% calc(100% - ${px(1)})`, `${t}% 100%`)
  p.push('0 100%')
  return `polygon(${p.join(', ')})`
}

type Props = ComponentProps<'div'> & {
  /** The colours (pixelThemes.ts): parchment (default), stone (white-grey) or aged */
  theme?: PixelTheme
  /** The poles' ends: red knobs (default), or plain */
  knobs?: boolean
  /** Where the small cuts in the paper's top edge are (% along it; [] for none) */
  topCuts?: number[]
  /** …and in its bottom edge */
  bottomCuts?: number[]
  /** Classes of the paper (its padding, its layout) */
  paperClassName?: string
}

/**
 * A pixel-art sign: a strip of paper held between two upright poles, taller than it, with red knobs at their ends (styles/parchment.css: the
 * bright scroll's colours, a black outline round it all); small cuts in the paper's edges. Put any text or element in it; `className` sizes and
 * places it, `paperClassName` lays out what is inside.
 *
 *   <PixelSign paperClassName="px-3">My map</PixelSign>
 *   <PixelSign knobs={false} topCuts={[]} bottomCuts={[50]}>…</PixelSign>
 */
export default function PixelSign({ theme, knobs = true, topCuts = [30, 66], bottomCuts = [45], className = '', paperClassName = '', children, ...rest }: Props) {
  const clip = signClip(topCuts, bottomCuts)
  const pole = (
    <span aria-hidden className="ui-sign-pole">
      {knobs && (
        <>
          <span className="ui-sign-knob top-0" />
          <span className="ui-sign-knob bottom-0" />
        </>
      )}
    </span>
  )
  return (
    <div className={`ui-sign ${pixelThemeClass(theme)} ${className}`} {...rest}>
      {pole}
      <div className={`ui-sign-paper ${paperClassName}`} style={clip === 'none' ? undefined : { clipPath: clip }}>
        {children}
      </div>
      {pole}
    </div>
  )
}
