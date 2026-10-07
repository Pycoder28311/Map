import { useId, useRef, type ToggleEvent } from 'react'
import {
  DOT,
  ITEM_CONTENT,
  PANEL,
  TRIGGER_BAR,
  TRIGGER_BARS,
  TRIGGER_DOT,
  TRIGGER_DOTS_X,
  TRIGGER_WHILE_OPEN,
  itemVars,
  menuVars,
  setTriggerOrigin,
  triggerDotVars,
} from './menuAnimation'
import { ICON_BG, ICON_BOX, ICON_BUTTON, ICON_SHOW } from './treeIconStyles'
import type { TreeIconBg, TreeIconShow, TreeMenuItem } from './types'

// Full class strings so Tailwind can detect them at build time.
// A native popover (top layer: above everything, never cut by the sidebar's scroll area; closes on
// a click outside or Esc). UA defaults reset (inset, margin, overflow: the dots fly in from above
// it); left/top are set when it opens. Opening: the dots animation (menuAnimation.ts); closing: at once.
const MENU =
  'inset-auto m-0 overflow-visible min-w-44 rounded-(--card-radius) border-(length:--menu-border) border-line ' +
  `bg-surface p-(--menu-p) text-fg shadow-lg ${PANEL}`

// Fixed height: the dots animation computes where each item is from it
const ITEM =
  'relative flex h-(--menu-item-h) w-full items-center rounded-(--btn-close-radius) px-(--menu-item-px) text-body text-start ' +
  'cursor-pointer transition-colors duration-150 ease-out hover:bg-fill ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

/** Space between the trigger and the menu (px) */
const GAP = 4
/** The menu never starts closer than this to the window's left edge (px) */
const EDGE = 8

type Props = {
  /** The trigger's name, e.g. "More: City Parks" */
  label: string
  show?: TreeIconShow
  bg?: TreeIconBg
  items: TreeMenuItem[]
}

/**
 * A right icon of a tree row that opens a menu of actions, with the dots animation (menuAnimation.ts):
 * one dot per item slides down out of the ⋯ and pops into its button. The menu's top-left corner sits just below
 * the trigger, moved left by the menu's corner radius (--card-radius). Closes on a pick, a click outside, Esc, scrolling
 * or resizing (it would no longer sit under its trigger).
 */
export default function TreeMenu({ label, show = 'always', bg, items }: Props) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = () => menuRef.current?.hidePopover()

  // Placed before it shows, so it never appears in the wrong spot. Moved left by its own corner
  // radius, so the straight part of its edge (not the curve) lines up with the trigger
  const place = (e: ToggleEvent<HTMLDivElement>) => {
    const trigger = triggerRef.current
    if (e.newState !== 'open' || !trigger) return
    const menu = e.currentTarget
    const rect = trigger.getBoundingClientRect()
    const radius = parseFloat(getComputedStyle(menu).borderTopLeftRadius) || 0
    const left = Math.max(EDGE, rect.left - radius)
    const top = rect.bottom + GAP
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    setTriggerOrigin(menu, rect, left, top)
  }

  // While open: close on scroll / resize (listening only then)
  const watch = (e: ToggleEvent<HTMLDivElement>) => {
    if (e.newState === 'open') {
      window.addEventListener('scroll', close, { capture: true, once: true })
      window.addEventListener('resize', close, { once: true })
    } else {
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }

  return (
    // group/menu: the trigger's ⋯ and − follow whether this menu is open
    <span style={menuVars(items.length)} className="group/menu contents">
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        className={`${ICON_BOX} ${ICON_SHOW[show]} ${ICON_BG[bg ?? 'hover']} ${TRIGGER_WHILE_OPEN} ${ICON_BUTTON}`}
      >
        <TriggerIcon />
      </button>

      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={watch} className={MENU}>
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            style={itemVars(i)}
            onClick={() => {
              close()
              item.onClick()
            }}
            className={`${ITEM} ${item.danger ? 'text-danger' : ''}`}
          >
            <span aria-hidden className={DOT} />
            <span className={ITEM_CONTENT}>
              {item.icon && <item.icon className="size-(--btn-icon-size) shrink-0" />}
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </span>
  )
}

/**
 * The trigger: a ⋯ whose dots leave one by one while the menu opens, their places then joining into
 * a −; on close the − splits back into the three dots. Drawn like Lucide's icons (24×24, stroke 2).
 */
function TriggerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-(--btn-icon-size)">
      {TRIGGER_BARS.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={11}
          width={bar.width}
          height={2}
          rx={1}
          fill="currentColor"
          stroke="none"
          className={`${TRIGGER_BAR} ${bar.origin}`}
        />
      ))}
      {TRIGGER_DOTS_X.map((cx, k) => (
        <circle key={cx} cx={cx} cy={12} r={1} style={triggerDotVars(k)} className={TRIGGER_DOT} />
      ))}
    </svg>
  )
}
