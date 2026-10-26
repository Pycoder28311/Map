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

// The element whose right edge the bar's shadow starts at: the sidebar itself (Sidebar.tsx), which is wider than its box in the page
// while it floats open over it (a closed sidebar opened by hovering), so none of the shadow falls on it
const START_EDGE = '#sidebar'

/**
 * A concave corner in the bar's colour (a quarter circle cut out of its bottom `side` corner): under a
 * bridge, against the taller popout; or under the bar, at the page's rounded corners
 */
const concave = (side: 'left' | 'right', radius?: string): CSSProperties => ({
  // No radius (the bridges' ears): the theme's own fillet, like the popouts' ears (--popout-fillet-*, tokens.css)
  background: radius
    ? `radial-gradient(circle at ${side === 'left' ? '100%' : '0'} 100%, transparent calc(${radius} - 0.5px), var(--surface) ${radius})`
    : side === 'left'
      ? 'var(--popout-fillet-r)'
      : 'var(--popout-fillet-l)',
})


const LINE_INSET = 'var(--popout-line-inset, 2px)'
const LINE_BOTTOM = 'var(--navbar-line-inset, 2px)'
const LINE_CLASS = 'pointer-events-none absolute bg-(--popout-line-color)'

/**
 * The thin line a theme draws inside the bar along its bottom (--navbar-line-display, tokens.css). Where a popout is
 * open it has a gap, and at the gap's ends it turns down into the line inside the popout (the popout's own inner line,
 * a theme's .popout-panel::before), so bar and popouts are outlined as one. `edge`: where the layer starts in the bar.
 */
function BarLine({ spans, edge }: { spans: OpenSpan[]; edge: number }) {
  const sorted = [...spans].sort((a, b) => a.left - b.left)
  const style = { display: 'var(--navbar-line-display)' } as CSSProperties
  const pieces: { start: string; end: string | null }[] = []
  let start = '0px'
  for (const s of sorted) {
    pieces.push({ start, end: `calc(${edge + s.left}px + ${LINE_INSET} + 1px)` })
    start = `calc(${edge + s.right}px - ${LINE_INSET} - 1px)`
  }
  pieces.push({ start, end: null })
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          aria-hidden
          style={{ ...style, left: p.start, bottom: LINE_BOTTOM, ...(p.end ? { width: `max(0px, calc(${p.end} - ${p.start}))` } : { right: 0 }) }}
          className={`${LINE_CLASS} h-px`}
        />
      ))}
      {/* Down from the line to the bar's edge, where the popout's own line goes on */}
      {sorted.flatMap((s) => [
        <span key={`${s.id}-l`} aria-hidden style={{ ...style, left: `calc(${edge + s.left}px + ${LINE_INSET})`, bottom: 0, height: `calc(${LINE_BOTTOM} + 1px)` }} className={`${LINE_CLASS} w-px`} />,
        <span key={`${s.id}-r`} aria-hidden style={{ ...style, left: `calc(${edge + s.right}px - ${LINE_INSET} - 1px)`, bottom: 0, height: `calc(${LINE_BOTTOM} + 1px)` }} className={`${LINE_CLASS} w-px`} />,
      ])}
    </>
  )
}

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
  // Where the sidebar ends, as it is now (also while it floats open): the bar's shadow starts there (none falls on the sidebar)
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
  const placed = shifted(open, offsets)
  const joins = bridges(placed, radius)
  const value = useMemo(() => ({ el, report, offsets }), [el, report, offsets])

  return (
    <PopoutLayerContext.Provider value={value}>
      {children}
      <BarLine spans={placed} edge={edge} />
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
