import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { stickToEdges, type Stuck } from './barPopoutEdges'

// Full class strings so Tailwind can detect them at build time.
/**
 * Where the popout (ears included) sits under its trigger before it is measured. start / end keep it
 * within the trigger's edge, so a trigger at the end of the bar never pushes it past the window.
 */
const ALIGN = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
} as const

// Material 3 "emphasized decelerate": fast out of the edge, soft landing (no overshoot, which
// would open a gap between the bar and the popout)
const EASE = 'ease-[cubic-bezier(0.05,0.7,0.1,1)]'

// Hidden: invisible (no hover, no focus) and slid up under the bar's edge. Shown while the trigger
// or the popout is hovered or holds keyboard focus. Closing waits a moment, so crossing the pointer
// from the trigger to the popout never flickers.
const SHOWN = 'group-hover/popout:visible group-focus-within/popout:visible'
const SLID_IN = 'group-hover/popout:translate-y-0 group-focus-within/popout:translate-y-0'
const NO_DELAY = 'group-hover/popout:delay-0 group-focus-within/popout:delay-0'
const TIMING = `duration-(--popout-duration) ${EASE} delay-150 ${NO_DELAY} motion-reduce:duration-0`

// Room around the popout inside its clip box, for its shadow (px; 0.75rem)
const ROOM = 12
// The element whose right edge popouts stick to on the left (the sidebar's box: Sidebar.tsx)
const START_EDGE = '[data-popout-edge="start"]'

/** The concave corners joining the popout to the bar: the bar's colour with a quarter circle cut out */
const ear = (side: 'left' | 'right'): CSSProperties => ({
  background: `radial-gradient(circle at ${side === 'left' ? '0' : '100%'} 100%, transparent calc(var(--popout-radius) - 0.5px), var(--surface) var(--popout-radius))`,
})

/** Stuck to a vertical edge: the concave corner below the popout, joining its bottom to that edge */
const edgeEar = (side: 'left' | 'right'): CSSProperties => ({
  background: `radial-gradient(circle at ${side === 'left' ? '100%' : '0'} 100%, transparent calc(var(--popout-radius) - 0.5px), var(--surface) var(--popout-radius))`,
})

/** Measured placement: the clip box's left (px, from the trigger's wrapper) and the stuck sides */
type Place = { left: number; stuck: Stuck }

type Props = {
  /** The bar's element that opens it on hover, e.g. a <Button> */
  trigger: ReactNode
  /** What grows out of the bar */
  children: ReactNode
  align?: keyof typeof ALIGN
  /** Placement in the bar, e.g. ml-auto to push it to the end */
  className?: string
}

/**
 * A rounded panel that grows out of a bar's bottom edge while its trigger is hovered (Hyprland /
 * Caelestia style): same colour as the bar, joined to it by concave corners, so the bar itself
 * seems to stretch. Put it directly in a bar that is a flex row (e.g. Navbar): it stretches to the
 * bar's height, so the popout starts exactly at the bar's edge.
 *
 * Near the bar's right end or the sidebar (within 2 × --popout-radius) it sticks to that edge too:
 * its side runs flush along it, and a concave corner below joins it to the edge (barPopoutEdges.ts).
 *
 *   <BarPopout trigger={<Button variant="ghost" icon={LuBell}>Updates</Button>}>
 *     <p>No new updates</p>
 *   </BarPopout>
 */
export default function BarPopout({ trigger, children, align = 'center', className = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [active, setActive] = useState(false)

  const measure = useCallback(() => {
    const wrap = wrapRef.current
    const panel = panelRef.current
    if (!wrap || !panel) return
    const radius = parseFloat(getComputedStyle(wrap).getPropertyValue('--popout-radius')) || 16
    const w = wrap.getBoundingClientRect()
    const width = panel.offsetWidth

    // The popout's own span (ears excluded) where `align` puts it
    const natural =
      align === 'start'
        ? { left: w.left + radius, right: w.left + radius + width }
        : align === 'end'
          ? { left: w.right - radius - width, right: w.right - radius }
          : { left: (w.left + w.right - width) / 2, right: (w.left + w.right + width) / 2 }

    const bar = (wrap.closest('header') ?? wrap.parentElement ?? wrap).getBoundingClientRect()
    const edge = document.querySelector(START_EDGE)
    const bounds = { left: edge ? edge.getBoundingClientRect().right : bar.left, right: bar.right }

    const { span, stuck } = stickToEdges(natural, bounds, 2 * radius)
    const padLeft = stuck.start ? 0 : radius + ROOM
    setPlace({ left: span.left - w.left - padLeft, stuck })
  }, [align])

  // While open: follow the sidebar's width and the window's size
  useEffect(() => {
    if (!active) return
    const edge = document.querySelector(START_EDGE)
    const observer = new ResizeObserver(measure)
    if (edge) observer.observe(edge)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [active, measure])

  const open = () => {
    measure()
    setActive(true)
  }
  const close = () => setActive(false)

  const stuck = place?.stuck ?? { start: false, end: false }
  const anyStuck = stuck.start || stuck.end
  // Measured: placed by style (no padding on a stuck side, so the edge clips the shadow; more at the
  // bottom for the edge ear). Not yet: the ALIGN class, with -mx cancelling the extra room.
  const clipStyle: CSSProperties | undefined = place ? {
    left: place.left,
    paddingLeft: stuck.start ? 0 : `calc(var(--popout-radius) + ${ROOM}px)`,
    paddingRight: stuck.end ? 0 : `calc(var(--popout-radius) + ${ROOM}px)`,
    paddingBottom: anyStuck ? `calc(var(--popout-radius) + ${ROOM}px)` : ROOM,
  } : undefined
  const clipClass = place ? '' : `-mx-3 px-[calc(var(--popout-radius)+0.75rem)] pb-3 ${ALIGN[align]}`

  return (
    <div
      ref={wrapRef}
      onPointerEnter={open}
      onPointerLeave={close}
      onFocus={open}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close()
      }}
      className={`group/popout relative flex items-center self-stretch ${className}`}
    >
      {trigger}

      {/* Clips the popout at the bar's edge while it slides; px: room for the ears, and (with pb) for
          its shadow */}
      <div
        style={clipStyle}
        className={`invisible absolute top-full z-30 overflow-hidden transition-[visibility] ${SHOWN} ${TIMING} ${clipClass}`}
      >
        {/* The bar's light shadow, following the ears' curve (drop-shadow, not box-shadow) */}
        <div
          ref={panelRef}
          style={{
            borderBottomLeftRadius: stuck.start ? 0 : undefined,
            borderBottomRightRadius: stuck.end ? 0 : undefined,
          }}
          className={`relative -translate-y-full rounded-b-(--popout-radius) bg-surface p-(--popout-p) [filter:var(--chrome-drop)] transition-transform ${SLID_IN} ${TIMING}`}
        >
          {stuck.start ? (
            <span aria-hidden style={edgeEar('left')} className="absolute top-full left-0 size-(--popout-radius)" />
          ) : (
            <span aria-hidden style={ear('left')} className="absolute top-0 right-full size-(--popout-radius)" />
          )}
          {stuck.end ? (
            <span aria-hidden style={edgeEar('right')} className="absolute top-full right-0 size-(--popout-radius)" />
          ) : (
            <span aria-hidden style={ear('right')} className="absolute top-0 left-full size-(--popout-radius)" />
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
