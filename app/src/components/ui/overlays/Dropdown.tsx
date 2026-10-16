import { useId, useRef, type ToggleEvent } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import type { PlainIcon } from '../icons/IconSlot'

// Full class strings so Tailwind can detect them at build time.
const TRIGGER =
  'inline-flex shrink-0 items-center gap-1 rounded-(--btn-radius) px-2 py-1 text-body text-fg-muted cursor-pointer ' +
  'transition-colors duration-200 ease-out hover-fill hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
// A native popover (top layer; closes on a click outside or Esc), UA defaults reset; top/right set on
// open. It pops out of the trigger's corner (it's aligned to the trigger's right edge, below it)
const MENU =
  'inset-auto m-0 min-w-32 rounded-(--menu-radius) border border-line bg-surface p-(--menu-p) text-fg shadow-lg ' +
  'origin-top-right animate-dropdown-in motion-reduce:animate-none'
// An icon-only trigger (e.g. ⋯ on a column's label)
const ICON_TRIGGER =
  'inline-flex shrink-0 items-center justify-center rounded-(--btn-close-radius) p-(--btn-close-p) text-fg-muted cursor-pointer ' +
  'transition-colors duration-200 ease-out hover-fill hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const ITEM =
  'flex h-(--menu-item-h) w-full items-center gap-(--menu-icon-gap) rounded-(--menu-item-radius) px-(--menu-item-px) ' +
  'text-body cursor-pointer hover-fill focus-visible:bg-fill focus-visible:outline-none aria-checked:font-medium ' +
  'disabled:cursor-default disabled:text-fg-muted disabled:hover:bg-transparent'

export type DropdownOption<T extends string> = {
  value: T
  label: string
  icon?: PlainIcon
  /** Shown, not clickable (e.g. the current choice) */
  disabled?: boolean
  /** Small text after the label (e.g. "column 2") */
  hint?: string
}

type Props<T extends string> = {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  /** What it chooses, for screen readers (e.g. "Kind") */
  label: string
  /** An icon-only trigger instead of the current choice (e.g. ⋯); `label` is then its name */
  triggerIcon?: PlainIcon
  /** The ▾ floats over the end of the choice, shown only while the pointer (or the keyboard) is on the button; it takes no room, so nothing moves */
  hoverChevron?: boolean
  className?: string
}

/**
 * A small button showing the current choice (▾), opening a menu of the options below it, aligned to
 * its right edge.
 *
 *   <Dropdown label="Kind" value={kind} onChange={setKind} options={[{ value: 'note', label: 'Note' }]} />
 */
export default function Dropdown<T extends string>({ value, options, onChange, label, triggerIcon: TriggerIcon, hoverChevron, className = '' }: Props<T>) {
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

  // Opened: focus the current choice (or the first one that can be chosen), for the keyboard
  const focusCurrent = (e: ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== 'open') return
    const menu = e.currentTarget
    ;(menu.querySelector<HTMLElement>('[aria-checked="true"]:not(:disabled)') ?? menu.querySelector<HTMLElement>('button:not(:disabled)'))?.focus()
  }

  return (
    <>
      {TriggerIcon ? (
        <button
          ref={triggerRef}
          type="button"
          popoverTarget={id}
          aria-haspopup="menu"
          aria-label={label}
          title={label}
          className={`${ICON_TRIGGER} ${className}`}
        >
          <TriggerIcon className="size-(--btn-icon-size)" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          popoverTarget={id}
          aria-haspopup="menu"
          aria-label={`${label}: ${current?.label}`}
          className={`${TRIGGER} ${hoverChevron ? 'group/dropdown relative' : ''} ${className}`}
        >
          {hoverChevron && (
            // Floats over the end of the name (in front of it, taking no room of its own), on a veil so the letters under it stay out of the way
            <span aria-hidden className="pointer-events-none absolute inset-y-0.5 end-0.5 flex items-center rounded-(--btn-close-radius) bg-surface/80 px-0.5 opacity-0 transition-opacity group-hover/dropdown:opacity-100 group-focus-visible/dropdown:opacity-100">
              <LuChevronDown className="size-4" />
            </span>
          )}
          {Icon && <Icon className="size-4" />}
          {current?.label}
          {!hoverChevron && <LuChevronDown className="size-4" aria-hidden />}
        </button>
      )}

      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={focusCurrent} className={MENU}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={o.value === value}
            disabled={o.disabled}
            onClick={() => {
              onChange(o.value)
              menuRef.current?.hidePopover()
              triggerRef.current?.focus()
            }}
            className={ITEM}
          >
            {o.icon && <o.icon className="size-4 text-fg-subtle" />}
            <span className="min-w-0 flex-1 truncate text-start">{o.label}</span>
            {o.hint && <span className="shrink-0 text-small text-fg-subtle">{o.hint}</span>}
          </button>
        ))}
      </div>
    </>
  )
}
