import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { LuPlus } from 'react-icons/lu'
import { useTimeout } from '../../../lib/useTimeout'
import Button from '../buttons/Button'
import ButtonLook from '../buttons/ButtonLook'
import { splitButtonClass } from '../buttons/buttonStyles'
import SplitButton, { SplitContent } from '../buttons/SplitButton'
import type { ButtonIcon } from '../icons/IconSlot'

// The box that grows is a button of the same look (styles/buttons.css, "ExtendMenu"): closed, its button shows; open,
// it is the button's face, with the options in it
const BOX = {
  ghost: 'ui-btn ui-btn-shade ui-extend',
  create: 'ui-btn ui-btn-venom ui-extend',
} as const

export type ExtendMenuItem<T extends string> = { value: T; label: string; icon?: ButtonIcon }

type Content = ReactNode | ((open: boolean) => ReactNode)

type Props<T extends string> = {
  /** ghost: a Shade button ("Sort by"); create: a Venom split button (an icon piece and a label piece: "Add +") */
  variant?: keyof typeof BOX
  items: ExtendMenuItem<T>[]
  /** The option the closed button already shows (e.g. the current kind): left out of the options */
  value?: T | null
  onSelect: (value: T) => void
  /** The menu's name, for screen readers */
  label: string
  /** The button's content (e.g. "Sort by ▾"; create: its label); a function gets whether the menu is open (e.g. to show an ✕) */
  children: Content
  /** create: the icon piece's content. Left out: a + that turns into an ✕ while open */
  splitIcon?: Content
  /** create: the label while open (the button's own label is then not a choice any more) */
  openLabel?: ReactNode
  /** create: which side the icon piece is on */
  iconPosition?: 'left' | 'right'
  /** Which way it extends: down from the button (default), or up (for a button at the bottom of its container) */
  direction?: 'down' | 'up'
  className?: string
}

const render = (content: Content, open: boolean) => (typeof content === 'function' ? content(open) : content)

type Size = { width: number; height: number }

/** How long it takes to fold back (ms): the box's width / height transition in styles/buttons.css */
const CLOSE_MS = 200

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
  splitIcon,
  openLabel = 'None',
  iconPosition = 'left',
  direction = 'down',
  className = '',
}: Props<T>) {
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  // The button's own size (a copy of its content, in the layout) and the options' natural size
  const sizerRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  // While it folds back (CLOSE_MS): it keeps its open look and only shrinks (styles/buttons.css, data-closing)
  const [closing, setClosing] = useState(false)
  const { set: setClosingTimer, clear: clearClosingTimer } = useTimeout()
  const close = useCallback(() => {
    setOpen(false)
    setClosing(true)
    setClosingTimer(() => setClosing(false), CLOSE_MS)
  }, [setClosingTimer])
  const show = (next: boolean) => {
    if (!next) return close()
    clearClosingTimer()
    setClosing(false)
    setOpen(true)
  }
  const [button, setButton] = useState<Size | null>(null)
  const [options, setOptions] = useState<Size>({ width: 0, height: 0 })
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
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // Until measured, it is just the button
  const grown: Size | undefined = button
    ? open
      ? { width: Math.max(button.width, options.width), height: button.height + options.height }
      : button
    : undefined

  // The button, closed (the sizer's copy) or as it is now. A split button, open: its pieces are Shade buttons (each its
  // own hover), its label "None", its + turned into an ✕ (styles/buttons.css, ExtendMenu)
  const split = (isOpen: boolean) => ({
    icon: splitIcon === undefined ? <span className="ui-extend-turn"><LuPlus /></span> : render(splitIcon, isOpen),
    iconPosition,
    pieceClassName: isOpen ? 'ui-btn ui-btn-shade' : '',
    // Both labels in one cell, only one shown: the piece is as wide as the wider one, open or closed, so the pieces
    // never move or change size (styles/buttons.css, .ui-extend-labels)
    children: (
      <span className="ui-extend-labels">
        <span data-shown={!isOpen}>{render(children, isOpen)}</span>
        <span data-shown={isOpen}>{openLabel}</span>
      </span>
    ),
  })
  const content = (isOpen: boolean) => (variant === 'create' ? <SplitContent {...split(isOpen)} /> : render(children, isOpen))
  const toggle = {
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': id,
    onClick: () => show(!open),
    className: 'w-full shrink-0',
    style: button ? { height: button.height } : undefined,
  }

  return (
    // The space in the layout: exactly the button's size (a copy of it, invisible), never the grown size. Flex, not
    // inline: no line box around the copy, so nothing is added below it and the button stays centred in its row
    // In front of everything beside it while it is open (and while it folds back)
    <div ref={wrapRef} className={`relative inline-flex ${open || closing ? 'z-30' : ''} ${className}`}>
      <div ref={sizerRef} aria-hidden className="invisible flex">
        {variant === 'create' ? <div className={splitButtonClass()}>{content(false)}</div> : <ButtonLook variant="ghost">{content(false)}</ButtonLook>}
      </div>
      {/* The options, laid out in full but unseen: their natural size is what the button grows to */}
      <div ref={optionsRef} aria-hidden className={`${BOX[variant]} invisible pointer-events-none absolute top-0 left-0 -z-10 inline-flex flex-col`}>
        {items.map((item) => (
          <span key={item.value} className="ui-extend-item">
            {item.icon && <span className="size-(--btn-icon-size) shrink-0" />}
            {item.label}
          </span>
        ))}
      </div>

      {/* The box: it grows (and wider) over what's beside it, down from the button or up. Its brackets are drawn on this
          box, so they move out to the corners of the dropdown as it grows */}
      <div
        style={grown}
        data-open={open}
        data-closing={closing}
        // Anchored at the button's centre: growing wider, it extends the same on both sides, and the
        // button's own content (centred) stays where it is
        className={`${BOX[variant]} absolute ${direction === 'up' ? 'bottom-0 flex-col-reverse' : 'top-0 flex-col'} flex left-1/2 -translate-x-1/2 z-20`}
      >
        {variant === 'create' ? (
          // Its own size, centred: the box grows around it, and it stays where it was
          <SplitButton {...toggle} {...split(open)} className="shrink-0 self-center" />
        ) : (
          <Button variant="ghost" {...toggle}>
            {render(children, open)}
          </Button>
        )}
        <div id={id} role="menu" aria-label={label} inert={!open} className="ui-extend-menu flex shrink-0 flex-col">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  close()
                  onSelect(item.value)
                }}
                className="ui-extend-item"
              >
                {Icon && <Icon className="opacity-70" />}
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
