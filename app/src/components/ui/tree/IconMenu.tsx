import { Fragment, useId, useRef, useState, type ToggleEvent } from 'react'
import { closeOnOutsideScroll } from '../../../lib/popoverScroll'
import { LuCheck } from 'react-icons/lu'
import { ICON_EFFECT_GROUP } from '../icons/iconEffects'
import type { PlainIcon } from '../icons/IconSlot'
import { ICON_BG, ICON_BOX, ICON_BUTTON, ICON_SHOW } from './treeIconStyles'
import { DROPDOWN_ITEM, DROPDOWN_MENU } from '../overlays/Dropdown'
import type { TreeIconShow, TreeMenuGroup } from './types'

type Props = {
  /** The trigger's name, e.g. "Add to Characters" */
  label: string
  /** The trigger's icon: a + that turns into a ✕ (a 45° turn) while the menu is open */
  icon: PlainIcon
  groups: TreeMenuGroup[]
  /** The trigger is the whole box around it, its icon as big as the tree rows' (the left icon of a row), not a padded icon button */
  square?: boolean
  /** Its icon turns 45° while the menu is open (default: a + becomes a ✕); false for an icon that stays as it is (a ⋯) */
  turn?: boolean
  /** hover: the trigger shows only while the pointer (or the keyboard) is on its row (the row has the `group/row` class); it stays while the menu is open */
  show?: TreeIconShow
  /** A small square button with a light background (a + in the gap between two blocks), instead of the row icons' box */
  small?: boolean
}

/**
 * A small icon button that opens a menu of actions below it, aligned to its right edge, popping out of its corner like the columns' ⋯ menu
 * (Dropdown's look and animation; not the row ⋯ menu's dots, see TreeMenu).
 * Its icon turns 45° while the menu is open (a + becomes a ✕; `turn={false}` keeps it). A line separates the groups, and an item with
 * `checked` is an option with a ✓. Closes on a pick, a click outside, Esc, scrolling or resizing.
 */
export default function IconMenu({ label, icon: Icon, groups, square = false, turn = true, show = 'always', small = false }: Props) {
  const id = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  // What stops the listening for the page scrolling, while the menu is open (a scroll inside the menu does not close it)
  const stopWatching = useRef<(() => void) | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // The item whose panel shows at the menu's left (an item with `panel`)
  const [panelOf, setPanelOf] = useState<string | null>(null)

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
    if (e.newState !== 'open') setPanelOf(null)
    if (e.newState === 'open') {
      stopWatching.current = closeOnOutsideScroll(e.currentTarget, close)
    } else {
      stopWatching.current?.()
      stopWatching.current = null
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
        className={`${ICON_EFFECT_GROUP} ${
          small
            ? `flex size-4 shrink-0 items-center justify-center transition-[opacity,background-color] duration-200 ease-out ${ICON_BG.always} hover:bg-fg/20`
            : `${square ? 'flex size-full items-center justify-center rounded-(--btn-close-radius)' : ICON_BOX} ${ICON_BG.hover}`
        } ${open ? '' : ICON_SHOW[show]} ${ICON_BUTTON}`}
      >
        <Icon className={`${small ? 'size-3' : square ? 'size-(--tree-row-icon)' : 'size-(--btn-icon-size)'} transition-transform duration-200 ease-out motion-reduce:transition-none ${turn && open ? 'rotate-45' : ''}`} />
      </button>
      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={watch} className={`${DROPDOWN_MENU} overflow-visible`}>
        {groups.map((group, g) => (
          <Fragment key={g}>
            {g > 0 && <hr className="my-(--menu-p) border-line" />}
            {group.map((item) => (
              <button
                key={item.label}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.checked}
                aria-expanded={item.panel ? panelOf === item.label : undefined}
                onClick={() => {
                  // An item with a panel keeps the menu open and shows the panel beside it
                  if (item.panel) return setPanelOf(panelOf === item.label ? null : item.label)
                  close()
                  item.onClick()
                }}
                className={`${DROPDOWN_ITEM} ${item.danger ? 'text-danger' : ''}`}
              >
                {item.icon && <item.icon className="size-(--btn-icon-size) shrink-0" />}
                <span className="min-w-0 flex-1 text-start">{item.label}</span>
                {item.checked && <LuCheck aria-hidden className="size-(--btn-icon-size) shrink-0" />}
              </button>
            ))}
          </Fragment>
        ))}
        {/* The open item's panel: at the menu's left, its right edge on the menu's left edge (no gap), level with the menu's top */}
        {groups.flat().map((item) =>
          item.panel && panelOf === item.label ? (
            <div key={item.label} className="absolute end-full top-[-1px] -me-px w-72 rounded-(--menu-radius) border border-line bg-surface p-2 text-fg shadow-lg">
              {item.panel}
            </div>
          ) : null,
        )}
      </div>
    </>
  )
}
