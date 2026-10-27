import { useId, useRef, useState, type ToggleEvent } from 'react'
import { ICON_EFFECT_GROUP } from '../icons/iconEffects'
import type { PlainIcon } from '../icons/IconSlot'
import { ICON_BG, ICON_BOX, ICON_BUTTON } from './treeIconStyles'
import { DROPDOWN_ITEM, DROPDOWN_MENU } from '../overlays/Dropdown'
import type { TreeMenuGroup } from './types'

type Props = {
  /** The trigger's name, e.g. "Add to Characters" */
  label: string
  /** The trigger's icon: a + that turns into a ✕ (a 45° turn) while the menu is open */
  icon: PlainIcon
  groups: TreeMenuGroup[]
  /** The trigger is the whole box around it, its icon as big as the tree rows' (the left icon of a row), not a padded icon button */
  square?: boolean
}

/**
 * A small icon button that opens a menu of actions below it, aligned to its right edge, popping out of its corner like the columns' ⋯ menu
 * (Dropdown's look and animation; not the row ⋯ menu's dots, see TreeMenu).
 * Its icon turns 45° while the menu is open (a + becomes a ✕). Closes on a pick, a click outside, Esc, scrolling or resizing.
 */
export default function IconMenu({ label, icon: Icon, groups, square = false }: Props) {
  const id = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const close = () => menuRef.current?.hidePopover()

  // Below the trigger, its right edge on the trigger's
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const trigger = triggerRef.current
    if (e.newState !== 'open' || !trigger) return
    const rect = trigger.getBoundingClientRect()
    e.currentTarget.style.top = `${rect.bottom + 4}px`
    e.currentTarget.style.right = `${document.documentElement.clientWidth - rect.right}px`
  }
  const watch = (e: ToggleEvent<HTMLDivElement>) => {
    setOpen(e.newState === 'open')
    if (e.newState === 'open') {
      window.addEventListener('scroll', close, { capture: true, once: true })
      window.addEventListener('resize', close, { once: true })
    } else {
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        aria-expanded={open}
        className={`${ICON_EFFECT_GROUP} ${square ? 'flex size-full items-center justify-center rounded-(--btn-close-radius)' : ICON_BOX} ${ICON_BG.hover} ${ICON_BUTTON}`}
      >
        <Icon className={`${square ? 'size-(--tree-row-icon)' : 'size-(--btn-icon-size)'} transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? 'rotate-45' : ''}`} />
      </button>
      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={watch} className={DROPDOWN_MENU}>
        {groups.flat().map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              item.onClick()
            }}
            className={`${DROPDOWN_ITEM} ${item.danger ? 'text-danger' : ''}`}
          >
            {item.icon && <item.icon className="size-(--btn-icon-size) shrink-0" />}
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
