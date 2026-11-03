import { useLayoutEffect, useMemo, useRef, useState } from 'react'

// ── The numbers to change ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The side of one triangle (px): smaller makes more, finer ones. Each is equilateral, pointing up or down, in rows with no gaps */
export const DASHBOARD_TRIANGLE_SIZE = 64

/**
 * The grays the triangles are, each one picked at random (the same every time): more of a colour in the list makes more triangles of
 * it. Close grays make it soft, like the paper mosaics it copies; further apart makes it bolder
 */
export const DASHBOARD_TRIANGLE_SHADES = ['#161616', '#181818', '#181818', '#1b1b1b', '#1b1b1b', '#1e1e1e', '#212121', '#252525']

/** How much darker the triangles are at the very bottom of the page (0–1): they darken smoothly as the page is scrolled down */
export const DASHBOARD_BOTTOM_DARKEN = 0.3

/** A dark gray glow around the Dashboard's text and cards, so they stand out from the background (a CSS `filter`: change its colour, blur and strength here) */
export const DASHBOARD_SHADE = 'drop-shadow(0 0 0px rgb(31 41 55 / 0.9)) drop-shadow(0 0 14px rgb(31 41 55 / 0.6))'

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The area the triangles are drawn for (px): bigger than any screen, the rest is cut off */
const AREA = { width: 3000, height: 2000 }
/** The seed of the colours: the same mosaic on every visit */
const SEED = 7

/** A small seeded random number generator (mulberry32): 0 ≤ n < 1 */
function random(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Every triangle of the area, as one path per gray (a few elements, not thousands): rows of triangles pointing up and down in turn */
function mosaic(side: number, shades: string[]): { colour: string; d: string }[] {
  const height = (side * Math.sqrt(3)) / 2
  const half = side / 2
  const next = random(SEED)
  const paths = new Map<string, string[]>(shades.map((s) => [s, []]))
  for (let row = 0; row * height < AREA.height; row++) {
    const top = row * height
    const bottom = top + height
    // Up and down in turn, and the other way round in the next row: a triangle's base is the next row's triangle's base, edge to edge
    for (let i = -1; i * half < AREA.width; i++) {
      const left = i * half
      const up = (((i + row) % 2) + 2) % 2 === 0
      const points = up ? `M${left} ${bottom}L${left + half} ${top}L${left + side} ${bottom}Z` : `M${left} ${top}L${left + side} ${top}L${left + half} ${bottom}Z`
      paths.get(shades[Math.floor(next() * shades.length)])!.push(points)
    }
  }
  return [...paths].map(([colour, list]) => ({ colour, d: list.join('') }))
}

/**
 * The Dashboard's background: a mosaic of equilateral triangles pointing up and down, edge to edge, each in one of a few dark grays.
 * It stays still while the page scrolls over it, and darkens smoothly the further down the page is scrolled. To change it, only the
 * numbers above.
 */
export default function DashboardBackground() {
  const root = useRef<HTMLDivElement>(null)
  const shadow = useRef<SVGRectElement>(null)
  const paths = useMemo(() => mosaic(DASHBOARD_TRIANGLE_SIZE, DASHBOARD_TRIANGLE_SHADES), [])
  // How far below the top of the scrolling area the page starts (the background reaches up that far, so it sits at the very top from the start), and how tall the area is
  const [lift, setLift] = useState(0)
  const [viewHeight, setViewHeight] = useState<number>()
  useLayoutEffect(() => {
    const page = root.current?.parentElement
    let scroller = page?.parentElement ?? null
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (!page || !scroller) return
    const area = scroller
    // The darkness follows how far down the page is scrolled (0 at the top, 1 at the bottom): no timer, nothing animated
    const paint = () => {
      const range = area.scrollHeight - area.clientHeight
      const progress = range > 0 ? Math.min(Math.max(area.scrollTop / range, 0), 1) : 0
      shadow.current?.setAttribute('opacity', String(progress * DASHBOARD_BOTTOM_DARKEN))
    }
    const measure = () => {
      setLift(page.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop)
      setViewHeight(area.clientHeight)
      paint()
    }
    measure()
    area.addEventListener('scroll', paint, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    return () => {
      area.removeEventListener('scroll', paint)
      observer.disconnect()
    }
  }, [])
  return (
    // Behind the triangles, their middle gray: the hairlines where two meet do not show
    <div ref={root} aria-hidden style={{ backgroundColor: DASHBOARD_TRIANGLE_SHADES[Math.floor(DASHBOARD_TRIANGLE_SHADES.length / 2)], top: -lift }} className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 overflow-clip">
      {/* Sticky: it stays at the top of the view while the page scrolls past */}
      <svg width="100%" style={{ height: viewHeight }} className="sticky top-0 block h-screen">
        {paths.map((p) => (
          <path key={p.colour} d={p.d} fill={p.colour} />
        ))}
        <rect ref={shadow} width="100%" height="100%" fill="#000000" opacity={0} />
      </svg>
    </div>
  )
}
