import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTimeout } from '../../../lib/useTimeout'
import { stickToEdges, type Stuck } from './barPopoutEdges'
import { usePopoutLayer } from './PopoutLayer'

// Material 3 "emphasized decelerate": fast out of the edge, soft landing (no overshoot, which
// would open a gap between the bar and the popout)
const EASE = 'ease-[cubic-bezier(0.05,0.7,0.1,1)]'

// Full class strings so Tailwind can detect them at build time.
// Hidden: invisible (no hover, no focus) and slid up under the bar's edge (the layer clips it there).
// Visibility switches at the end of the slide when closing, at once when opening
const PANEL =
  `pointer-events-auto absolute top-0 popout-panel rounded-b-(--popout-panel-radius) bg-surface p-(--popout-p) ` +
  `transition-[translate,visibility,left,right] duration-(--popout-duration) ${EASE} motion-reduce:duration-0`
const SHOWN = 'visible translate-y-0'
const HIDDEN = 'invisible -translate-y-full'

/** Hover mode: closing waits this long, so moving the pointer from the trigger to the popout never flickers (ms) */
const CLOSE_DELAY = 150

// The element whose right edge popouts stick to on the left (the sidebar's box: Sidebar.tsx)
const START_EDGE = '[data-popout-edge="start"]'

/** The concave corners joining the popout to the bar (the theme draws them: --popout-fillet-*, tokens.css) */
const ear = (side: 'left' | 'right'): CSSProperties => ({
  background: side === 'left' ? 'var(--popout-fillet-l)' : 'var(--popout-fillet-r)',
})

/** Stuck to a vertical edge: the concave corner below the popout, joining its bottom to that edge */
const edgeEar = (side: 'left' | 'right'): CSSProperties => ({
  background: side === 'left' ? 'var(--popout-fillet-r)' : 'var(--popout-fillet-l)',
})

const NONE = '0px'
const SQUARE = 'var(--popout-radius)'

/**
 * Measured placement in the layer: the panel's left and its right edge's distance from the layer's
 * right (px), and the stuck sides
 */
type Place = { left: number; right: number; stuck: Stuck }

type Props = {
  /** The bar's element that opens it, e.g. a <Button> */
  trigger: ReactNode
  /** What grows out of the bar */
  children: ReactNode
  /** Where it sits under the trigger before sticking to an edge */
  align?: 'start' | 'center' | 'end'
  /**
   * How it opens:
   * - hover: while the trigger or the popout is hovered or holds focus
   * - click: a click on the trigger toggles it
   * - focus: only through `open` (e.g. while a search field has focus)
   * click and focus close on Esc and on a press outside the trigger and the popout.
   */
  mode?: 'hover' | 'click' | 'focus'
  /** Controlled: open or not (with onOpenChange) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** auto: sticks to the bar's right end or the sidebar when near them; end: always to the right end */
  stick?: 'auto' | 'end'
  /**
   * The part of the popout to align under the trigger (instead of the whole popout), at its right.
   * The popout is then held by its right edge: what grows on the anchor's left (e.g. filters opening)
   * extends it to the left, and the anchor never moves.
   */
  anchorRef?: RefObject<HTMLElement | null>
  /** Placement in the bar, e.g. ml-auto to push it to the end */
  className?: string
}

/**
 * A rounded panel that grows out of a bar's bottom edge (Hyprland / Caelestia style): same colour as
 * the bar, joined to it by concave corners, so the bar itself seems to stretch. Put it directly in a
 * bar that is a flex row, inside a <PopoutLayer> (e.g. the Navbar): the panel opens in that layer,
 * which casts the shadow and joins popouts that open side by side into one shape.
 *
 * Near the bar's right end or the sidebar (within 2 × --popout-radius) it sticks to that edge too:
 * its side runs flush along it, and a concave corner below joins it to the edge (barPopoutEdges.ts).
 *
 *   <BarPopout mode="click" trigger={<Button variant="ghost">History</Button>}>
 *     <RecentList />
 *   </BarPopout>
 */
export default function BarPopout({
  trigger,
  children,
  align = 'center',
  mode = 'hover',
  open: openProp,
  onOpenChange,
  stick = 'auto',
  anchorRef,
  className = '',
}: Props) {
  const layer = usePopoutLayer()
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [ownOpen, setOwnOpen] = useState(false)
  const open = openProp ?? ownOpen
  const [place, setPlace] = useState<Place | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const closeTimer = useTimeout()

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  const measure = useCallback(() => {
    const wrap = wrapRef.current
    const panel = panelRef.current
    if (!wrap || !panel || !layer.el) return
    const radius = parseFloat(getComputedStyle(wrap).getPropertyValue('--popout-radius')) || 16
    const layerRect = layer.el.getBoundingClientRect()
    const origin = layerRect.left
    const w = wrap.getBoundingClientRect()
    const width = panel.offsetWidth

    // The part aligned under the trigger (the whole popout, or its anchor), and the popout's room
    // right of it
    const anchor = anchorRef?.current
    const aligned = anchor ? anchor.offsetWidth : width
    const besideRight = anchor ? width - (anchor.getBoundingClientRect().left - panel.getBoundingClientRect().left) - aligned : 0
    const alignedRight =
      align === 'start' ? w.left + radius + aligned : align === 'end' ? w.right - radius : (w.left + w.right + aligned) / 2
    // The popout's own span (ears excluded) where `align` puts it
    const natural = { left: alignedRight + besideRight - width, right: alignedRight + besideRight }

    const bar = (wrap.closest('header') ?? wrap.parentElement ?? wrap).getBoundingClientRect()
    const edge = document.querySelector(START_EDGE)
    const bounds = { left: edge ? edge.getBoundingClientRect().right : bar.left, right: bar.right }

    const { span, stuck } =
      stick === 'end'
        ? { span: { left: bounds.right - width, right: bounds.right }, stuck: { start: false, end: true } }
        : stickToEdges(natural, bounds, 2 * radius)
    setPlace({ left: span.left - origin, right: layerRect.right - span.right, stuck })
  }, [align, stick, anchorRef, layer.el])

  // Opening: placed before it shows
  useLayoutEffect(() => {
    if (open) measure()
  }, [open, measure])

  // Its size (content may change while open, e.g. search results): measured, and placed again. Also
  // placed from the start (the observer fires once at once), so opening never slides it sideways
  // from nowhere (`left` transitions, for when the layer moves it beside a neighbour)
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const observer = new ResizeObserver(() => {
      setSize({ width: panel.offsetWidth, height: panel.offsetHeight })
      measure()
    })
    observer.observe(panel)
    return () => observer.disconnect()
  }, [measure, layer.el])

  // While open: follow the sidebar's width and the window's size
  useEffect(() => {
    if (!open) return
    const edge = document.querySelector(START_EDGE)
    const observer = new ResizeObserver(measure)
    if (edge) observer.observe(edge)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [open, measure])

  // Tell the layer where it is while open (it joins popouts that touch)
  useEffect(() => {
    if (open && place) layer.report(id, { left: place.left, right: place.left + size.width, height: size.height })
    else layer.report(id, null)
  }, [open, place, size, id, layer])
  useEffect(() => () => layer.report(id, null), [id, layer])

  // Click / focus modes: Esc or a press outside closes it
  useEffect(() => {
    if (!open || mode === 'hover') return
    // Also inside: anything marked data-popout-keep (e.g. the share overlay the Share popout drives)
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (wrapRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        (target instanceof Element && target.closest('[data-popout-keep]') !== null))
    const onDown = (e: PointerEvent) => {
      // Inside a popover menu opened from the popout (top layer, still in its DOM): inside too
      if (!inside(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, mode, setOpen])

  // Hover mode: open on hover or focus (trigger or popout), close a moment after leaving both
  const hoverHandlers =
    mode === 'hover'
      ? {
          onPointerEnter: () => {
            closeTimer.clear()
            setOpen(true)
          },
          onPointerLeave: () => closeTimer.set(() => setOpen(false), CLOSE_DELAY),
          onFocus: () => {
            closeTimer.clear()
            setOpen(true)
          },
          onBlur: (e: React.FocusEvent) => {
            const next = e.relatedTarget
            if (!(next instanceof Node && (wrapRef.current?.contains(next) || panelRef.current?.contains(next)))) setOpen(false)
          },
        }
      : {}

  const stuck = place?.stuck ?? { start: false, end: false }

  const panel = (
    <div
      ref={panelRef}
      {...hoverHandlers}
      data-open={open || undefined}
      style={{
        // Moved left by the layer when it would cover a neighbour (they then meet and join). With an
        // anchor: held by its right edge, so growing on the left never moves the anchor
        ...(anchorRef
          ? { right: (place?.right ?? 0) - (open ? (layer.offsets[id] ?? 0) : 0) }
          : { left: (place?.left ?? 0) + (open ? (layer.offsets[id] ?? 0) : 0) }),
        borderBottomLeftRadius: stuck.start ? 0 : undefined,
        borderBottomRightRadius: stuck.end ? 0 : undefined,
        // For a theme's clip-path on .popout-panel (themes/arcane.css): per side, a free side has an ear at the top and its bottom
        // corner cut; a side stuck to an edge has a foot (the edge ear) below instead
        ...({
          '--ear-l': stuck.start ? NONE : SQUARE,
          '--cut-l': stuck.start ? NONE : SQUARE,
          '--foot-l': stuck.start ? SQUARE : NONE,
          '--ear-r': stuck.end ? NONE : SQUARE,
          '--cut-r': stuck.end ? NONE : SQUARE,
          '--foot-r': stuck.end ? SQUARE : NONE,
        } as CSSProperties),
      }}
      className={`${PANEL} ${open ? SHOWN : HIDDEN}`}
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
  )

  return (
    <div
      ref={wrapRef}
      {...hoverHandlers}
      // Only clicks on the trigger itself: React events from the portalled panel bubble here too
      onClick={(e) => {
        if (mode === 'click' && e.target instanceof Node && wrapRef.current?.contains(e.target)) setOpen(!open)
      }}
      className={`relative flex items-center self-stretch ${className}`}
    >
      {trigger}
      {layer.el && createPortal(panel, layer.el)}
    </div>
  )
}
