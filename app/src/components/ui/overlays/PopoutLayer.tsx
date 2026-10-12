import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { bridges, separate, shifted, type OpenSpan } from './popoutMerge'

type LayerValue = {
  /** The layer's element: where the popouts' panels are portalled */
  el: HTMLDivElement | null
  /** An open popout's place (layer coordinates), or null once it closes */
  report: (id: string, span: Omit<OpenSpan, 'id'> | null) => void
  /** How far each open popout moves left so it doesn't cover its neighbour (px, ≤ 0) */
  offsets: Record<string, number>
}

const PopoutLayerContext = createContext<LayerValue | null>(null)

export function usePopoutLayer(): LayerValue {
  const value = useContext(PopoutLayerContext)
  if (!value) throw new Error('BarPopout must be inside a <PopoutLayer> (e.g. the Navbar)')
  return value
}

// The element whose right edge the bar's shadow starts at (the sidebar's box: Sidebar.tsx)
const START_EDGE = '[data-popout-edge="start"]'

/**
 * A concave corner in the bar's colour (a quarter circle cut out of its bottom `side` corner): under a
 * bridge, against the taller popout; or under the bar, at the page's rounded corners
 */
const concave = (side: 'left' | 'right', radius = 'var(--popout-radius)'): CSSProperties => ({
  background: `radial-gradient(circle at ${side === 'left' ? '100%' : '0'} 100%, transparent calc(${radius} - 0.5px), var(--surface) ${radius})`,
})


type Props = {
  children: ReactNode
  /** The bar's height (CSS), e.g. var(--sidebar-rail) */
  barHeight: string
  /** The page's top corners under the bar are rounded this much (px; e.g. the panes' frame), 0: square */
  corners?: number
}

/**
 * Where a bar's popouts (BarPopout) open, and the bar's shadow. One layer behind the bar, from the
 * sidebar's edge to the right: it draws the bar's shape again (hidden under the real bar) and casts
 * one shadow for it and every popout, so the shadow runs under the bar and around an open popout
 * as if the bar itself stretched, with no seam where they meet. The popouts are clipped at the bar's
 * edge while they slide out. Popouts that open side by side never cover each other (one slides left
 * until they meet) and, touching, are bridged into one shape (popoutMerge.ts). Wrap the bar's content
 * in it; the bar must be `relative`. The page under it draws no shadow of its own along its top.
 */
export default function PopoutLayer({ children, barHeight, corners = 0 }: Props) {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  // Where the sidebar ends: the bar's shadow starts there (none falls on the sidebar)
  const [edge, setEdge] = useState(0)

  useEffect(() => {
    const sidebar = document.querySelector(START_EDGE)
    if (!sidebar) return
    const update = () => setEdge(sidebar.getBoundingClientRect().right)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(sidebar)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  const [spans, setSpans] = useState<Record<string, Omit<OpenSpan, 'id'>>>({})

  const report = useCallback((id: string, span: Omit<OpenSpan, 'id'> | null) => {
    setSpans((prev) => {
      const old = prev[id]
      if (!span) {
        if (!old) return prev
        const { [id]: _, ...rest } = prev
        return rest
      }
      if (old && old.left === span.left && old.right === span.right && old.height === span.height) return prev
      return { ...prev, [id]: span }
    })
  }, [])

  const radius = el ? parseFloat(getComputedStyle(el).getPropertyValue('--popout-radius')) || 16 : 16
  const open = Object.entries(spans).map(([id, s]) => ({ id, ...s }))
  const offsetsKey = JSON.stringify(separate(open))
  // Stable while nothing moves (popouts re-render on every change of it)
  const offsets = useMemo(() => JSON.parse(offsetsKey) as Record<string, number>, [offsetsKey])
  const joins = bridges(shifted(open, offsets), radius)
  const value = useMemo(() => ({ el, report, offsets }), [el, report, offsets])

  return (
    <PopoutLayerContext.Provider value={value}>
      {children}
      {/* Behind the bar (-z): the bar's shape, the page's corners, the popouts; one shadow for all. Only
          the panels (and bridges) take the pointer */}
      <div
        style={{ left: edge }}
        className="pointer-events-none absolute top-0 right-0 -z-10 h-screen overflow-hidden [filter:var(--chrome-drop)]"
      >
        <div className="absolute inset-x-0 top-0 bg-surface" style={{ height: barHeight }} />
        {corners > 0 && (
          <>
            <span aria-hidden className="absolute left-0" style={{ top: barHeight, width: corners, height: corners, ...concave('left', `${corners}px`) }} />
            <span aria-hidden className="absolute right-0" style={{ top: barHeight, width: corners, height: corners, ...concave('right', `${corners}px`) }} />
          </>
        )}
        {/* The popouts: clipped at the bar's edge while they slide out */}
        <div ref={setEl} style={{ top: barHeight }} className="absolute inset-x-0 bottom-0 overflow-hidden">
          {/* Bridges appear once both popouts have slid out, so they never hang in the air */}
          {joins.map((b) => (
            <div key={`${b.left}:${b.right}`} className="animate-bridge-in motion-reduce:animate-none">
              <div className="absolute top-0 bg-surface" style={{ left: b.left, width: b.right - b.left, height: b.height }} />
              {b.ear && (
                <span
                  aria-hidden
                  className="absolute size-(--popout-radius)"
                  style={{ left: b.ear.left, top: b.ear.top, ...concave(b.ear.side) }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </PopoutLayerContext.Provider>
  )
}
