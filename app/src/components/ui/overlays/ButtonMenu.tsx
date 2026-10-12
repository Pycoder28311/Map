import { useId, useRef, useState, type ReactNode, type ToggleEvent } from 'react'
import { LuCheck } from 'react-icons/lu'
import type { ButtonIcon } from '../icons/IconSlot'

// Full class strings so Tailwind can detect them at build time.
// The button's look: green (create), or a background only on hover (ghost); a bit darker while open
const LOOK = {
  create: { button: 'bg-create text-create-fg hover:bg-create-hover', open: 'bg-create-hover' },
  ghost: { button: 'text-fg hover:bg-fill', open: 'bg-fill' },
} as const
// The padding, corners and text of a sidebar row (as tall as one)
const BUTTON =
  'inline-flex items-center gap-1.5 rounded-(--btn-radius) px-(--pill-px) py-(--pill-py) text-body font-medium cursor-pointer transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
// A native popover (top layer; closes on a click outside or Esc), UA defaults reset; placed on open,
// under the button's right end. It pops out of the button's corner (like Dropdown)
const MENU =
  'inset-auto m-0 min-w-40 rounded-(--menu-radius) border border-line bg-surface p-(--menu-p) text-fg shadow-lg ' +
  'origin-top-right animate-dropdown-in motion-reduce:animate-none'
const ITEM =
  'flex h-(--menu-item-h) w-full cursor-pointer items-center gap-(--menu-icon-gap) rounded-(--menu-item-radius) px-(--menu-item-px) ' +
  'text-body text-start whitespace-nowrap hover:bg-fill focus-visible:bg-fill focus-visible:outline-none aria-checked:font-medium'

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
 * A button (a sidebar row's size) that opens a menu popping out below it, at its right end.
 *
 *   <ButtonMenu variant="ghost" label="Sort" value={sort} onSelect={setSort} items={[{ value: 'new', label: 'Newest' }]}>
 *     Sort by
 *   </ButtonMenu>
 */
export default function ButtonMenu<T extends string>({ variant = 'ghost', items, value, onSelect, label, children, className = '' }: Props<T>) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const look = LOOK[variant]

  // Placed before it shows, so it never appears in the wrong spot
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const trigger = triggerRef.current
    if (e.newState !== 'open' || !trigger) return
    const rect = trigger.getBoundingClientRect()
    e.currentTarget.style.top = `${rect.bottom + 4}px`
    e.currentTarget.style.right = `${window.innerWidth - rect.right}px`
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
        className={`${BUTTON} ${look.button} ${open ? look.open : ''} ${className}`}
      >
        {children}
      </button>
      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={toggled} className={MENU}>
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
              className={ITEM}
            >
              {Icon && <Icon className="size-4 shrink-0 text-fg-subtle" />}
              <span className="flex-1">{item.label}</span>
              {checked && <LuCheck className="size-4 shrink-0" />}
            </button>
          )
        })}
      </div>
    </>
  )
}
