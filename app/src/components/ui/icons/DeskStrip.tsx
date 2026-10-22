import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { deskLayout, pathOf } from './deskLayout'

/** The size of one pixel of the strip (px) */
const PIXEL = 1.5

/**
 * A faint pixel desk behind the navbar's left side: a compass, a protractor and a pencil far apart, with little stars between them, each turned a little, as wide
 * and as tall as the box it is given (it fills it with whole pixels). Drawn in --desk-color (the sidebar chains' colour), fading out at
 * both ends. Pure decoration: it takes no clicks and is hidden from screen readers. Where things go: deskLayout.ts.
 */
export default function DeskStrip({ className = '' }: { className?: string }) {
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

  const desk = useMemo(() => (size.cols > 0 && size.rows > 0 ? deskLayout(size.cols, size.rows) : null), [size])

  return (
    <div
      ref={box}
      aria-hidden
      className={`pointer-events-none flex items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_70%,transparent)] ${className}`}
    >
      {desk && (
        <svg viewBox={`0 0 ${size.cols} ${size.rows}`} width={size.cols * PIXEL} height={size.rows * PIXEL} shapeRendering="crispEdges">
          <path d={pathOf(desk.stars)} fill="var(--desk-color)" />
          {desk.objects.map((object, i) => (
            // Turned a little (desk-object, styles/animations.css)
            <g key={i} className="desk-object" style={{ '--desk-angle': `${object.angle}deg` } as CSSProperties}>
              <path d={pathOf(object.soft)} fill="var(--desk-soft)" />
              <path d={pathOf(object.ink)} fill="var(--desk-color)" />
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}
