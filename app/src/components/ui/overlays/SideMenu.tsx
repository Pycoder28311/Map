import { useId, useRef, type ReactNode, type ToggleEvent } from 'react'
import { closeOnOutsideScroll } from '../../../lib/popoverScroll'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import Button from '../buttons/Button'
import type { ButtonSize, ButtonVariant } from '../buttons/buttonStyles'
import type { ButtonIcon, PlainIcon } from '../icons/IconSlot'
import { DROPDOWN_ITEM, DROPDOWN_MENU } from './Dropdown'

export type SideMenuItem<T extends string> = { value: T; label: string; icon?: PlainIcon }

type Props<T extends string> = {
  /** The button's look (default: ghost, filled, without the white corners) */
  variant?: ButtonVariant
  items: SideMenuItem<T>[]
  onSelect: (value: T) => void
  /** The pointer (or the keyboard) is on an option, or left them all (null): e.g. to show a preview of it */
  onHover?: (value: T | null) => void
  /** The menu's name, for screen readers */
  label: string
  /** The button's icon (default: a ‹ arrow) */
  icon?: ButtonIcon
  /** An icon before the text of a button with `arrowEnd` */
  lead?: ButtonIcon
  /** The button's size (default: sm) */
  size?: ButtonSize
  /** The button's text */
  children: ReactNode
  className?: string
  /** Which side the menu opens on (default: left). When there is no room on that side it opens on the other */
  side?: 'left' | 'right'
  /** A › at the right end of the button instead of the arrow before the text; the text stays in the middle */
  arrowEnd?: boolean
}

/**
 * A full-width button that opens its menu to its left, with the Dropdown's popup (it pops out of its corner), the menu's bottom edge level
 * with the button's: for a button at the bottom of a box that sits at the right of the page. A pick, a click outside, Esc, scrolling or
 * resizing closes it.
 */
export default function SideMenu<T extends string>({ variant = 'ghost', items, onSelect, onHover, label, icon = LuChevronLeft, lead, size = 'sm', children, className = '', side = 'left', arrowEnd = false }: Props<T>) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // What stops the listening for the page scrolling, while the menu is open (a scroll inside the menu does not close it)
  const stopWatching = useRef<(() => void) | null>(null)
  const close = () => menuRef.current?.hidePopover()

  // Placed before it shows: its right edge a little left of the button, its bottom edge on the button's
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const trigger = triggerRef.current
    if (e.newState !== 'open' || !trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = document.documentElement.clientWidth
    const menu = e.currentTarget
    // Its room on the wanted side (the menu is about as wide as its widest option, measured when it is shown: a guess before)
    const need = menu.offsetWidth || 200
    const roomLeft = rect.left - 4
    const roomRight = width - rect.right - 4
    const left = side === 'left' ? roomLeft >= need || roomLeft >= roomRight : roomRight < need && roomLeft > roomRight
    if (left) {
      menu.style.left = 'auto'
      menu.style.right = `${width - rect.left + 4}px`
    } else {
      menu.style.right = 'auto'
      menu.style.left = `${rect.right + 4}px`
    }
    e.currentTarget.style.bottom = `${window.innerHeight - rect.bottom}px`
    e.currentTarget.style.maxHeight = `${rect.bottom - 8}px`
  }
  const watch = (e: ToggleEvent<HTMLDivElement>) => {
    if (e.newState === 'open') {
      stopWatching.current = closeOnOutsideScroll(e.currentTarget, close)
    } else {
      stopWatching.current?.()
      stopWatching.current = null
      onHover?.(null)
    }
  }

  return (
    <>
      <Button ref={triggerRef} variant={variant} size={size} plain={variant === 'ghost'} filled={variant === 'ghost'} icon={arrowEnd ? lead : icon} popoverTarget={id} aria-haspopup="menu" className={`justify-center ${className}`}>
        {children}
        {/* (after the text, a small gap from it) */}
        {arrowEnd && <LuChevronRight aria-hidden className="ms-1" />}
      </Button>
      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={watch} className={`${DROPDOWN_MENU} overflow-y-auto`}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="menuitem"
            onMouseEnter={() => onHover?.(item.value)}
            onFocus={() => onHover?.(item.value)}
            onMouseLeave={() => onHover?.(null)}
            onBlur={() => onHover?.(null)}
            onClick={() => {
              close()
              onSelect(item.value)
            }}
            className={DROPDOWN_ITEM}
          >
            {item.icon && <item.icon className="size-(--btn-icon-size) shrink-0" />}
            <span className="min-w-0 flex-1 text-start">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
