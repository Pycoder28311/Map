import { useId, useRef, useState, type ReactNode, type ToggleEvent } from 'react'
import { LuCheck } from 'react-icons/lu'
import type { ButtonIcon } from '../icons/IconSlot'

// Full class strings so Tailwind can detect them at build time.
// Small buttons (e.g. a list's Sort by / Create): the menu takes the button's colours
const LOOK = {
  primary: { button: 'bg-accent text-accent-fg hover:bg-accent-hover', open: 'bg-accent-hover', menu: 'bg-accent text-accent-fg', item: 'hover:bg-accent-hover focus-visible:bg-accent-hover' },
  secondary: { button: 'bg-fill text-fg hover:bg-fill-strong', open: 'bg-fill-strong', menu: 'bg-fill text-fg', item: 'hover:bg-fill-strong focus-visible:bg-fill-strong' },
} as const
const BUTTON =
  'inline-flex items-center gap-1.5 rounded-(--btn-radius) px-2.5 py-1 text-small font-medium cursor-pointer transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
// A native popover (top layer; closes on a click outside or Esc), UA defaults reset; placed on open.
// Its top corners are square where it hangs from the button; it grows down out of it
const MENU = 'inset-auto m-0 rounded-b-(--btn-radius) rounded-t-none p-1 text-small shadow-md animate-menu-extend motion-reduce:animate-none'
const ITEM =
  'flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-start whitespace-nowrap focus-visible:outline-none'

export type ButtonMenuItem<T extends string> = { value: T; label: string; icon?: ButtonIcon }

type Props<T extends string> = {
  variant?: keyof typeof LOOK
  items: ButtonMenuItem<T>[]
  /** The checked item, if the menu chooses one (e.g. a sort) */
  value?: T | null
  onSelect: (value: T) => void
  /** The menu's name, for screen readers */
  label: string
  /** The button's content (e.g. "Sort by ▾", or "Create │ ▾") */
  children: ReactNode
  className?: string
}

/**
 * A small button whose menu hangs from its bottom edge like an extension of it: the same colours,
 * square corners where they meet (the button's bottom ones while open), at least as wide as the
 * button, growing down out of it.
 *
 *   <ButtonMenu variant="secondary" label="Sort" value={sort} onSelect={setSort} items={[{ value: 'new', label: 'Newest' }]}>
 *     Sort by
 *   </ButtonMenu>
 */
export default function ButtonMenu<T extends string>({ variant = 'secondary', items, value, onSelect, label, children, className = '' }: Props<T>) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const look = LOOK[variant]

  // Placed before it shows: under the button, at least as wide; wider, its top right corner is
  // free (rounded)
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const trigger = triggerRef.current
    if (e.newState !== 'open' || !trigger) return
    const menu = e.currentTarget
    const rect = trigger.getBoundingClientRect()
    menu.style.left = `${rect.left}px`
    menu.style.top = `${rect.bottom}px`
    menu.style.minWidth = `${rect.width}px`
    menu.style.borderTopRightRadius = menu.offsetWidth > rect.width + 1 ? 'var(--btn-radius)' : ''
  }

  const toggled = (e: ToggleEvent<HTMLDivElement>) => {
    setOpen(e.newState === 'open')
    if (e.newState === 'open') e.currentTarget.querySelector<HTMLElement>('[aria-checked="true"], button')?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${BUTTON} ${look.button} ${open ? `rounded-b-none ${look.open}` : ''} ${className}`}
      >
        {children}
      </button>
      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={toggled} className={`${MENU} ${look.menu}`}>
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
                menuRef.current?.hidePopover()
                onSelect(item.value)
              }}
              className={`${ITEM} ${look.item}`}
            >
              {Icon && <Icon className="size-3.5 shrink-0" />}
              <span className="flex-1">{item.label}</span>
              {checked && <LuCheck className="size-3.5 shrink-0" />}
            </button>
          )
        })}
      </div>
    </>
  )
}
