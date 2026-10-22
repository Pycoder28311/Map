import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { pathOf, spaceLayout } from './spaceLayout'

/** The size of one pixel of the sky (px) */
const PIXEL = 3

/**
 * A faint pixel sky behind the navbar's left side: small planets and moons far apart, with stars between them, as wide and as tall as
 * the box it is given (it fills it with whole pixels). Drawn in --space-color (the sidebar chains' colour), fading out at both ends.
 * Pure decoration: it takes no clicks and is hidden from screen readers. Where things go: spaceLayout.ts.
 */
export default function SpaceStrip({ className = '' }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ cols: 0, rows: 0 })

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ cols: Math.floor(el.clientWidth / PIXEL), rows: Math.floor(el.clientHeight / PIXEL) })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { planets, stars } = useMemo(() => (size.cols > 0 && size.rows > 0 ? spaceLayout(size.cols, size.rows) : { planets: [], stars: [] }), [size])

  return (
    <div
      ref={box}
      aria-hidden
      className={`pointer-events-none flex items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_70%,transparent)] ${className}`}
    >
      {size.cols > 0 && (
        <svg
          viewBox={`0 0 ${size.cols} ${size.rows}`}
          width={size.cols * PIXEL}
          height={size.rows * PIXEL}
          shapeRendering="crispEdges"
          style={{ color: 'var(--space-color)' }}
          fill="currentColor"
        >
          <path d={pathOf(planets)} />
          <path d={pathOf(stars)} />
        </svg>
      )}
    </div>
  )
}
