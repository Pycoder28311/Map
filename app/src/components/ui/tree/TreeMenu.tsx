import { Fragment, useId, useRef, type ToggleEvent } from 'react'
import {
  DOT,
  DOT_SLOT,
  BLOOM,
  ITEM_CONTENT,
  BACKDROP,
  SEPARATOR_IN,
  TRIGGER_BAR,
  TRIGGER_BARS,
  TRIGGER_DOT,
  TRIGGER_DOTS_X,
  TRIGGER_WHILE_OPEN,
  itemVars,
  menuVars,
  setTriggerOrigin,
} from './menuAnimation'
import { ICON_EFFECT_GROUP, iconEffectClass, type IconEffects } from '../icons/iconEffects'
import { ICON_BG, ICON_BOX, ICON_BUTTON, ICON_SHOW } from './treeIconStyles'
import type { TreeIconBg, TreeIconShow, TreeMenuGroup } from './types'

// Full class strings so Tailwind can detect them at build time.
// A native popover (top layer: above everything, never cut by the sidebar's scroll area; closes on
// a click outside or Esc). UA defaults reset (inset, margin, overflow: the dots fly in from above
// it); left/top are set when it opens. Opening: the dots animation (menuAnimation.ts); closing: at once.
// Its look is drawn by BACKDROP (it grows with the items); its border stays, see-through, for the sizes
const MENU =
  'inset-auto m-0 overflow-visible min-w-(--menu-min-w) rounded-(--menu-radius) border-(length:--menu-border) border-transparent ' +
  'bg-transparent p-(--menu-p) text-fg'

// Fixed height: the dots animation computes where each item is from it
const ITEM =
  'relative flex h-(--menu-item-h) w-full items-center rounded-(--menu-item-radius) px-(--menu-item-px) text-body text-start ' +
  'cursor-pointer transition-colors duration-150 ease-out hover:bg-fill ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

// Items and the lines between groups, --menu-gap apart
const LIST = 'flex flex-col gap-(--menu-gap)'

// The line between groups: 1px + --menu-sep-space above and below (the dots animation counts it),
// inset like the items' text
const SEPARATOR = 'mx-(--menu-item-px) my-(--menu-sep-space) h-px shrink-0 bg-line'

/** The menu never starts closer than this to the window's left edge (px) */
const EDGE = 8

type Props = {
  /** The trigger's name, e.g. "More: City Parks" */
  label: string
  show?: TreeIconShow
  bg?: TreeIconBg
  /** The trigger's hover/click effects (both on by default) */
  effects?: IconEffects
  /** Groups of actions, a line between them */
  groups: TreeMenuGroup[]
}

/**
 * A right icon of a tree row that opens a menu of actions, with the dots animation (menuAnimation.ts):
 * the ⋯ becomes a queue of dots, one per item; the
 * front one slides down and pops into its button while the rest move up to take its place. The menu's top-left corner sits just below
 * the trigger, moved left by the menu's corner radius (--menu-radius). Closes on a pick, a click outside, Esc, scrolling
 * or resizing (it would no longer sit under its trigger).
 */
export default function TreeMenu({ label, show = 'always', bg, effects, groups }: Props) {
  const id = useId()
  const count = groups.reduce((n, group) => n + group.length, 0)
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
    const style = getComputedStyle(menu)
    const left = Math.max(EDGE, rect.left - (parseFloat(style.borderTopLeftRadius) || 0))
    const top = rect.bottom + (parseFloat(style.getPropertyValue('--menu-offset')) || 0)
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
    <span style={menuVars(count)} className="group/menu contents">
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        className={`${ICON_EFFECT_GROUP} ${ICON_BOX} ${ICON_SHOW[show]} ${ICON_BG[bg ?? 'hover']} ${TRIGGER_WHILE_OPEN} ${ICON_BUTTON}`}
      >
        <TriggerIcon className={iconEffectClass(effects)} />
      </button>

      <div ref={menuRef} id={id} popover="auto" role="menu" aria-label={label} onBeforeToggle={place} onToggle={watch} className={MENU}>
        <span aria-hidden className={BACKDROP} />
        <div className={LIST}>
          {groups.map((group, g) => {
            // Index of the group's first item among all items
            const start = groups.slice(0, g).reduce((n, prev) => n + prev.length, 0)
            return (
              <Fragment key={g}>
                {g > 0 && <div role="separator" style={itemVars(start, g)} className={`${SEPARATOR} ${SEPARATOR_IN}`} />}
                {group.map((item, j) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    style={itemVars(start + j, g)}
                    onClick={() => {
                      close()
                      item.onClick()
                    }}
                    className={`${ITEM} ${item.danger ? 'text-danger' : ''}`}
                  >
                    <span aria-hidden className={BLOOM} />
                    <span aria-hidden className={DOT_SLOT}>
                      <span className={DOT} />
                    </span>
                    <span className={ITEM_CONTENT}>
                      {item.icon && <item.icon className="size-(--btn-icon-size) shrink-0" />}
                      {item.label}
                    </span>
                  </button>
                ))}
              </Fragment>
            )
          })}
        </div>
      </div>
    </span>
  )
}

/**
 * The trigger: a ⋯ that hands its dots to the menu's queue when it opens, its places then joining
 * into a −; on close the − splits back into the three dots. Drawn like Lucide's icons (24×24, stroke 2).
 */
function TriggerIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`size-(--btn-icon-size) ${className}`}>
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
      {TRIGGER_DOTS_X.map((cx) => (
        <circle key={cx} cx={cx} cy={12} r={1} className={TRIGGER_DOT} />
      ))}
    </svg>
  )
}
