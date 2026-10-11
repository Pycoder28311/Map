import { useId, useRef, type ToggleEvent } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import type { PlainIcon } from '../icons/IconSlot'

// Full class strings so Tailwind can detect them at build time.
const TRIGGER =
  'inline-flex shrink-0 items-center gap-1 rounded-(--btn-radius) px-2 py-1 text-body text-fg-muted cursor-pointer ' +
  'transition-colors duration-200 ease-out hover:bg-fill hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
// A native popover (top layer; closes on a click outside or Esc), UA defaults reset; left/top set on open
const MENU =
  'inset-auto m-0 min-w-32 rounded-(--menu-radius) border border-line bg-surface p-(--menu-p) text-fg shadow-lg'
const ITEM =
  'flex h-(--menu-item-h) w-full items-center gap-(--menu-icon-gap) rounded-(--menu-item-radius) px-(--menu-item-px) ' +
  'text-body cursor-pointer hover:bg-fill focus-visible:bg-fill focus-visible:outline-none aria-checked:font-medium'

export type DropdownOption<T extends string> = { value: T; label: string; icon?: PlainIcon }

type Props<T extends string> = {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  /** What it chooses, for screen readers (e.g. "Kind") */
  label: string
  className?: string
}

/**
 * A small button showing the current choice (▾), opening a menu of the options below it, aligned to
 * its right edge.
 *
 *   <Dropdown label="Kind" value={kind} onChange={setKind} options={[{ value: 'note', label: 'Note' }]} />
 */
export default function Dropdown<T extends string>({ value, options, onChange, label, className = '' }: Props<T>) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value) ?? options[0]
  const Icon = current?.icon

  // Placed before it shows, so it never appears in the wrong spot
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const trigger = triggerRef.current
    if (e.newState !== 'open' || !trigger) return
    const menu = e.currentTarget
    const rect = trigger.getBoundingClientRect()
    menu.style.top = `${rect.bottom + 4}px`
    menu.style.right = `${window.innerWidth - rect.right}px`
  }

  // Opened: focus the current choice, for the keyboard
  const focusCurrent = (e: ToggleEvent<HTMLDivElement>) => {
    if (e.newState === 'open') e.currentTarget.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-haspopup="menu"
        aria-label={`${label}: ${current?.label}`}
        className={`${TRIGGER} ${className}`}
      >
        {Icon && <Icon className="size-4" />}
        {current?.label}
        <LuChevronDown className="size-4" aria-hidden />
      </button>

      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={focusCurrent} className={MENU}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={o.value === value}
            onClick={() => {
              onChange(o.value)
              menuRef.current?.hidePopover()
              triggerRef.current?.focus()
            }}
            className={ITEM}
          >
            {o.icon && <o.icon className="size-4 text-fg-subtle" />}
            {o.label}
          </button>
        ))}
      </div>
    </>
  )
}
