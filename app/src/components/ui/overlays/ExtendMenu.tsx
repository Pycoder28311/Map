import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { LuCheck } from 'react-icons/lu'
import type { ButtonIcon } from '../icons/IconSlot'

// Full class strings so Tailwind can detect them at build time.
// What the whole thing looks like: the button, and the same colour once it has grown
const LOOK = {
  ghost: { closed: 'text-fg hover:bg-fill', open: 'bg-fill text-fg shadow-md', item: 'hover:bg-fill-strong focus-visible:bg-fill-strong' },
  secondary: { closed: 'bg-fill text-fg hover:bg-fill-strong', open: 'bg-fill-strong text-fg shadow-md', item: 'hover:bg-fill focus-visible:bg-fill' },
  create: { closed: 'bg-create text-create-fg hover:bg-create-hover', open: 'bg-create-hover text-create-fg shadow-md', item: 'hover:bg-create focus-visible:bg-create' },
} as const
// The padding, corners and text of a sidebar row (as tall as one)
const ROW = 'flex items-center gap-1.5 px-(--pill-px) py-(--pill-py) text-body font-medium'
const ITEM =
  'flex w-full cursor-pointer items-center gap-(--menu-icon-gap) rounded-(--btn-radius) px-(--pill-px) py-(--pill-py) text-body text-start whitespace-nowrap ' +
  'transition-colors focus-visible:outline-none aria-checked:font-semibold'
const GROW = 'duration-200 ease-out motion-reduce:transition-none'

export type ExtendMenuItem<T extends string> = { value: T; label: string; icon?: ButtonIcon }

type Props<T extends string> = {
  variant?: keyof typeof LOOK
  items: ExtendMenuItem<T>[]
  /** The checked item, if the menu chooses one */
  value?: T | null
  onSelect: (value: T) => void
  /** The menu's name, for screen readers */
  label: string
  /** The button's content (e.g. "Sort by ▾") */
  children: ReactNode
  /** Which edge stays put while it grows wider: the left (it grows right) or the right (it grows left) */
  align?: 'start' | 'end'
  /** Which way it extends: down from the button (default), or up (for a button at the bottom of its container) */
  direction?: 'down' | 'up'
  className?: string
}

type Size = { width: number; height: number }

/**
 * A dropdown button that extends: clicked, the button itself grows downward and its options are part
 * of it (the same colour and corners), so the menu is an extension of the button. An option wider
 * than the button makes the button grow wider too, over the same time, to fit it. It overlays what's
 * below it (the space it takes in the layout stays the button's); a click outside, Esc or a pick folds
 * it back.
 *
 *   <ExtendMenu variant="ghost" label="Sort" value={sort} onSelect={setSort} items={[{ value: 'new', label: 'Newest' }]}>
 *     Sort by
 *   </ExtendMenu>
 */
export default function ExtendMenu<T extends string>({
  variant = 'ghost',
  items,
  value,
  onSelect,
  label,
  children,
  align = 'start',
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

  // Measured: the button, and the options laid out in full (the list is cut by the growing height,
  // not by its own width, so its natural width is the widest option)
  useLayoutEffect(() => {
    const sizer = sizerRef.current
    const list = optionsRef.current
    if (!sizer || !list) return
    const measure = () => {
      setButton({ width: sizer.offsetWidth, height: sizer.offsetHeight })
      setOptions({ width: list.offsetWidth, height: list.offsetHeight })
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
      <div ref={sizerRef} aria-hidden className={`${ROW} invisible`}>
        {children}
      </div>
      {/* The options, laid out in full but unseen: their natural size is what the button grows to */}
      <div ref={optionsRef} aria-hidden className="invisible pointer-events-none absolute top-0 left-0 -z-10 inline-flex flex-col py-0.5">
        {items.map((item) => (
          <span key={item.value} className={ITEM}>
            {item.icon && <span className="size-4 shrink-0" />}
            {item.label}
            <span className="size-4 shrink-0" />
          </span>
        ))}
      </div>

      {/* The button itself: it grows (and wider) over what's beside it, down from the button or up */}
      <div
        style={grown}
        className={`absolute ${direction === 'up' ? 'bottom-0 flex-col-reverse' : 'top-0 flex-col'} flex ${align === 'start' ? 'left-0' : 'right-0'} z-20 overflow-hidden rounded-(--btn-radius) transition-[width,height,background-color,box-shadow] ${GROW} ${open ? look.open : look.closed}`}
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
          <span className={`${ROW} h-full`}>{children}</span>
        </button>
        <div id={id} role="menu" aria-label={label} inert={!open} className="flex shrink-0 flex-col py-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const checked = value !== undefined ? item.value === value : undefined
            return (
              <button
                key={item.value}
                type="button"
                role={checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={checked}
                onClick={() => {
                  setOpen(false)
                  onSelect(item.value)
                }}
                className={`${ITEM} ${look.item}`}
              >
                {Icon && <Icon className="size-4 shrink-0 text-current opacity-70" />}
                <span className="flex-1">{item.label}</span>
                {checked ? <LuCheck className="size-4 shrink-0" /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
