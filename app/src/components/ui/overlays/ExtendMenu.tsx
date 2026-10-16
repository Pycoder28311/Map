import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { ButtonIcon } from '../icons/IconSlot'

// Full class strings so Tailwind can detect them at build time.
// What the whole thing looks like: the button, and the same colour once it has grown. `marks`: the theme's corner
// marks (styles/cornerMarks.css): always, or only while the pointer is on it or it is open
const LOOK = {
  ghost: { marks: 'corner-marks-hover', closed: 'text-fg hover-fill', open: 'bg-fill text-fg shadow-md', item: 'hover-fill-strong focus-visible:bg-fill-strong' },
  secondary: { marks: 'corner-marks-hover', closed: 'bg-fill text-fg hover:bg-fill-strong', open: 'bg-fill-strong text-fg shadow-md', item: 'hover:bg-fill focus-visible:bg-fill' },
  // create: a split button (see `padded`): closed, it has no background of its own: each part is its own
  // green button, with the page showing between them. Open: one gray shape, like the other dropdowns
  create: { marks: 'corner-marks', closed: 'text-create-fg [box-shadow:var(--btn-create-shadow)]', open: 'bg-fill text-fg shadow-md', item: 'hover-fill-strong focus-visible:bg-fill-strong' },
} as const
// The padding, corners and text of a sidebar row (as tall as one)
// whitespace-nowrap: the button's text never breaks into lines, whatever width it is given
const ROW = 'flex items-center text-body font-medium whitespace-nowrap'
// With the standard padding, and a gap between its contents (e.g. a label and an icon)
const ROW_PADDING = 'gap-1.5 px-(--pill-px) py-(--pill-py)'
const ITEM =
  'flex w-full cursor-pointer items-center gap-(--menu-icon-gap) rounded-(--menu-item-radius) px-(--pill-px) py-(--pill-py) text-body text-start whitespace-nowrap ' +
  'transition-colors focus-visible:outline-none'
const GROW = 'duration-200 ease-out motion-reduce:transition-none'

export type ExtendMenuItem<T extends string> = { value: T; label: string; icon?: ButtonIcon }

type Props<T extends string> = {
  variant?: keyof typeof LOOK
  items: ExtendMenuItem<T>[]
  /** The option the closed button already shows (e.g. the current kind): left out of the options */
  value?: T | null
  onSelect: (value: T) => void
  /** The menu's name, for screen readers */
  label: string
  /** The button's content (e.g. "Sort by ▾"); a function gets whether the menu is open (e.g. to show an ✕) */
  children: ReactNode | ((open: boolean) => ReactNode)
  /**
   * The button's padding is the standard one (a sidebar row's). Off: the content brings its own, e.g. a
   * split button whose parts each fill the button's height and darken on their own
   */
  padded?: boolean
  /** Which way it extends: down from the button (default), or up (for a button at the bottom of its container) */
  direction?: 'down' | 'up'
  className?: string
}

type Size = { width: number; height: number }

/**
 * A dropdown button that extends: clicked, the button itself grows downward and its options are part
 * of it (the same colour and corners), so the menu is an extension of the button. An option wider
 * than the button makes the button grow wider too, over the same time, to fit it: the same on both
 * sides, so the button's own text stays where it is. It overlays what's
 * below it (the space it takes in the layout stays the button's); a click outside, Esc or a pick folds
 * it back.
 *
 *   <ExtendMenu variant="ghost" label="Sort" value={sort} onSelect={setSort} items={[{ value: 'new', label: 'Newest' }]}>
 *     Sort by
 *   </ExtendMenu>
 */
export default function ExtendMenu<T extends string>({
  variant = 'ghost',
  items: allItems,
  value,
  onSelect,
  label,
  children,
  padded = true,
  direction = 'down',
  className = '',
}: Props<T>) {
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  // The button's own size (a copy of its content, in the layout) and the options' natural size
  const sizerRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [button, setButton] = useState<Size | null>(null)
  const [options, setOptions] = useState<Size>({ width: 0, height: 0 })
  const look = LOOK[variant]
  // Only what the button doesn't already show
  const items = allItems.filter((item) => item.value !== value)

  // Measured: the button, and the options laid out in full (the list is cut by the growing height,
  // not by its own width, so its natural width is the widest option)
  useLayoutEffect(() => {
    const sizer = sizerRef.current
    const list = optionsRef.current
    if (!sizer || !list) return
    // Rounded up: text is a fraction of a pixel wider than offsetWidth says, and a box a hair too
    // narrow for it would break it onto a second line
    const size = (el: HTMLElement): Size => {
      const rect = el.getBoundingClientRect()
      return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) }
    }
    const measure = () => {
      setButton(size(sizer))
      setOptions(size(list))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sizer)
    observer.observe(list)
    return () => observer.disconnect()
  }, [items.length])

  // Open: Esc or a press outside folds it back
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Until measured, it is just the button
  const grown: Size | undefined = button
    ? open
      ? { width: Math.max(button.width, options.width), height: button.height + options.height }
      : button
    : undefined

  return (
    // The space in the layout: the button's size (its content, invisible), never the grown size
    <div ref={wrapRef} className={`relative inline-block ${className}`}>
      <div ref={sizerRef} aria-hidden className={`${ROW} ${padded ? ROW_PADDING : ''} invisible`}>
        {typeof children === 'function' ? children(false) : children}
      </div>
      {/* The options, laid out in full but unseen: their natural size is what the button grows to */}
      <div ref={optionsRef} aria-hidden className="invisible pointer-events-none absolute top-0 left-0 -z-10 inline-flex flex-col p-(--menu-p)">
        {items.map((item) => (
          <span key={item.value} className={ITEM}>
            {item.icon && <span className="size-4 shrink-0" />}
            {item.label}
          </span>
        ))}
      </div>

      {/* The button itself: it grows (and wider) over what's beside it, down from the button or up. Its corner
          marks (corner-marks) are drawn on this box, so they move out to the corners of the dropdown as it grows */}
      <div
        style={grown}
        data-open={open}
        // Anchored at the button's centre: growing wider, it extends the same on both sides, and the
        // button's own content (centred) stays where it is
        className={`absolute ${direction === 'up' ? 'bottom-0 flex-col-reverse' : 'top-0 flex-col'} flex left-1/2 -translate-x-1/2 z-20 overflow-hidden rounded-(--btn-radius) ${look.marks} transition-[width,height,background-color,box-shadow] ${GROW} ${open ? look.open : look.closed}`}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="w-full shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          style={button ? { height: button.height } : undefined}
        >
          <span className={`${ROW} ${padded ? ROW_PADDING : ''} h-full justify-center`}>
            {typeof children === 'function' ? children(open) : children}
          </span>
        </button>
        <div id={id} role="menu" aria-label={label} inert={!open} className="flex shrink-0 flex-col p-(--menu-p)">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSelect(item.value)
                }}
                className={`${ITEM} ${look.item}`}
              >
                {Icon && <Icon className="size-4 shrink-0 text-current opacity-70" />}
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
