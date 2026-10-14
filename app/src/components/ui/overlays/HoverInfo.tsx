import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { useTimeout } from '../../../lib/useTimeout'
import { hoverInfoPosition, type HoverInfoPlace, type Side } from './hoverInfoPosition'

type Props = {
  title: string
  text?: ReactNode
  /** A key or gesture, shown as a small tag, e.g. "Double-click" */
  shortcut?: string
  side?: Side
  /** How long the pointer rests before it opens (ms); focus opens it at once */
  delay?: number
  /** One element that takes focus (a button): it gets `aria-describedby`, and its own `title` is dropped so there is one tooltip */
  children: ReactElement<{ title?: string; 'aria-describedby'?: string }>
}

const ARROW = 10

/**
 * A card that says what a button does: opens after the pointer rests on it (or on keyboard focus), closes on leave, blur, Esc
 * or scroll. In the top layer (never clipped), never takes the pointer, flips to the other side when it doesn't fit.
 *
 *   <HoverInfo title="Split" text="Click it, then click the line." shortcut="Double-click"><IconButton … /></HoverInfo>
 */
export default function HoverInfo({ title, text, shortcut, side = 'right', delay = 400, children }: Props) {
  const id = useId()
  const wrap = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [place, setPlace] = useState<HoverInfoPlace | null>(null)
  const timer = useTimeout()

  const show = (wait: number) =>
    timer.set(() => setAnchor(wrap.current?.firstElementChild?.getBoundingClientRect() ?? null), wait)
  const hide = () => {
    timer.clear()
    setAnchor(null)
    setPlace(null)
  }

  // Placed once it is measured, before it is painted
  useLayoutEffect(() => {
    const el = card.current
    if (!anchor || !el) return
    el.showPopover()
    const box = el.getBoundingClientRect()
    setPlace(hoverInfoPosition(anchor, { width: box.width, height: box.height }, { width: window.innerWidth, height: window.innerHeight }, side))
  }, [anchor, side])

  useEffect(() => {
    if (!anchor) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  })

  const arrowStyle = place
    ? place.side === 'right'
      ? { left: -ARROW / 2 - 1, top: place.arrow - ARROW / 2 }
      : place.side === 'left'
        ? { right: -ARROW / 2 - 1, top: place.arrow - ARROW / 2 }
        : place.side === 'bottom'
          ? { top: -ARROW / 2 - 1, left: place.arrow - ARROW / 2 }
          : { bottom: -ARROW / 2 - 1, left: place.arrow - ARROW / 2 }
    : undefined
  const arrowBorder = { right: 'border-b border-l', left: 'border-t border-r', bottom: 'border-t border-l', top: 'border-b border-r' }

  return (
    <span
      ref={wrap}
      className="contents"
      onPointerEnter={() => show(delay)}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={() => show(0)}
      onBlur={hide}
    >
      {cloneElement(children, { title: undefined, 'aria-describedby': anchor ? id : undefined })}
      {anchor && (
        <div
          ref={card}
          id={id}
          popover="manual"
          role="tooltip"
          style={{ left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? 'visible' : 'hidden' }}
          className="pointer-events-none fixed inset-auto m-0 w-max max-w-64 overflow-visible rounded-(--card-radius) border border-line bg-surface p-0 text-fg shadow-xl"
        >
          {place && <span aria-hidden style={{ width: ARROW, height: ARROW, ...arrowStyle }} className={`absolute rotate-45 bg-surface ${arrowBorder[place.side]} border-line`} />}
          <div className="relative flex flex-col gap-1 px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body font-medium">{title}</span>
              {shortcut && <kbd className="rounded-(--corner-sm) bg-fill px-1.5 text-small text-fg-muted">{shortcut}</kbd>}
            </div>
            {text && <p className="text-small text-fg-muted">{text}</p>}
          </div>
        </div>
      )}
    </span>
  )
}
