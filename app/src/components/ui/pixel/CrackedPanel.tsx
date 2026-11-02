import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties } from 'react'
import { crackedEdge } from './crackedEdge'
import { pixelThemeClass, type PixelTheme } from './pixelThemes'

/** The roll's width (px) */
const ROLL_W = 8

/**
 * The paper's end curled over a little, as a papyrus scroll's (not rolled all the way round), seen a little from above: a thin cylinder (lit from
 * the left: a dark edge, a bright highlight, the paper's colour, a shadow turning away), its top end showing the paper's edge curling over once,
 * its bottom end rounded,
 * and the soft shadow it casts on the paper beside it. The theme's colours
 */
function Roll({ side }: { side: 'left' | 'right' }) {
  const left = side === 'left'
  const at = { [left ? 'left' : 'right']: -3 }
  const ink = 'var(--scroll-ink)'
  return (
    <>
      {/* The shadow it casts on the paper */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0"
        style={{
          [left ? 'left' : 'right']: ROLL_W - 3,
          width: 6,
          background: `linear-gradient(to ${left ? 'right' : 'left'}, rgb(0 0 0 / 0.3), transparent)`,
        }}
      />
      {/* The body: rounded at its bottom end */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          ...at,
          top: -1,
          bottom: -2,
          width: ROLL_W,
          borderRadius: '0 0 50% 50% / 0 0 2px 2px',
          border: `1px solid ${ink}`,
          background: `linear-gradient(to right,
            color-mix(in oklab, var(--scroll-shade), black 35%) 0%,
            var(--scroll-shade) 12%,
            color-mix(in oklab, var(--scroll-light), white 25%) 32%,
            var(--scroll-paper) 52%,
            var(--scroll-shade) 78%,
            color-mix(in oklab, var(--scroll-shade), black 45%) 100%)`,
        }}
      />
      {/* The top end, seen a little from above: the edge of the paper curling over once, not a full turn (a "C" of the paper's edge) */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          ...at,
          top: -3,
          width: ROLL_W,
          height: 4,
          borderRadius: '50%',
          border: `1px solid ${ink}`,
          [left ? 'borderRightColor' : 'borderLeftColor']: 'transparent',
          background: `radial-gradient(ellipse at ${left ? 70 : 30}% 60%, color-mix(in oklab, var(--scroll-shade), black 30%) 0 35%, var(--scroll-light) 36%)`,
        }}
      />
    </>
  )
}

type Props = ComponentProps<'div'> & {
  /** Its edge is the same every time for the same seed (a different one: different cracks) */
  seed?: string
  /** How many cracks the top and the bottom have (default 5); the left and right sides get as many as the same density gives them */
  cuts?: number
  /** How deep the deepest crack goes in, in px (default 8) */
  depth?: number
  /** How far in from the edge (and from every crack) the paper fades to the darker edge colour, in px (default 4) */
  fade?: number
  /** The colours (pixelThemes.ts, the pixel elements' themes): its paper, its faded edge and its outline */
  theme?: PixelTheme
  /** A rolled end on that side, like a papyrus scroll's: a cylinder a little taller than the panel, the paper coming out of it (that side is not cracked) */
  roll?: 'left' | 'right'
  /** Classes of the inside (its padding, its layout) */
  contentClassName?: string
}

/**
 * A panel with a cracked edge, like the left form's card but more cracked: the paper fades into a darker colour along its edges and into every
 * crack (the paper is the same cracked shape a little smaller, blurred, over the edge colour), a thin outline round it and a soft shadow (.ui-crack).
 * Put any text or element in it; `className` sizes and places it, `contentClassName` lays out what is inside.
 *
 *   <CrackedPanel theme="pastel" contentClassName="px-3 py-1">My map</CrackedPanel>
 */
export default function CrackedPanel({ seed = 'panel', cuts = 5, depth = 8, fade = 4, roll, theme, className = '', contentClassName = '', style, children, ...rest }: Props) {
  // The edge is made for the panel's size (in px), so the cracks are as dense on every side; again when it changes size
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize((was) => (was.w === el.offsetWidth && was.h === el.offsetHeight ? was : { w: el.offsetWidth, h: el.offsetHeight }))
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])
  const straight = { left: roll === 'left', right: roll === 'right' }
  const edge = crackedEdge(seed, size.w, size.h, cuts, depth, straight)
  // The paper inside: the same edge for its own (smaller) size
  const paper = crackedEdge(seed, size.w - 2 * fade, size.h - 2 * fade, cuts, depth, straight)
  const colours = { '--crack-line': 'var(--scroll-ink)', color: 'var(--scroll-text)' } as CSSProperties
  return (
    <div className={`ui-crack relative ${pixelThemeClass(theme)} ${className}`} style={{ ...colours, ...style }} {...rest}>
      <div ref={box} className="relative isolate h-full" style={{ clipPath: edge, backgroundColor: 'var(--scroll-shade)' }}>
        {/* The paper: the same cracked shape, `fade` in from every side, blurred into the edge colour under it */}
        <div aria-hidden className="pointer-events-none absolute -z-10" style={{ inset: fade, filter: `blur(${fade * 0.75}px)` }}>
          <div className="size-full" style={{ clipPath: paper, backgroundColor: 'var(--scroll-paper)' }} />
        </div>
        <div className={`h-full ${contentClassName}`} style={roll ? { [roll === 'left' ? 'paddingLeft' : 'paddingRight']: ROLL_W } : undefined}>
          {children}
        </div>
      </div>
      {roll && <Roll side={roll} />}
    </div>
  )
}
