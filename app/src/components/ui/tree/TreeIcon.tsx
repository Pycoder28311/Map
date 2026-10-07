import { ICON_EFFECT_GROUP, iconEffectClass } from '../icons/iconEffects'
import { ICON_BG, ICON_BOX, ICON_BUTTON, ICON_SHOW } from './treeIconStyles'
import TreeMenu from './TreeMenu'
import type { TreeRightIcon } from './types'

/** One icon on the right of a tree row, from its settings (TreeRightIcon in types.ts) */
export default function TreeIcon(props: TreeRightIcon) {
  const { show = 'always', bg, hoverEffect, clickEffect } = props
  const effects = { hoverEffect, clickEffect }

  // A menu of actions below it (its own ⋯ trigger)
  if (props.menu) return <TreeMenu label={props.label} show={show} bg={bg} effects={effects} groups={props.menu} />

  const { icon: Icon, label, onClick } = props

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={`${ICON_EFFECT_GROUP} ${ICON_BOX} ${ICON_SHOW[show]} ${ICON_BG[bg ?? 'hover']} ${ICON_BUTTON}`}
      >
        <Icon className={`size-(--btn-icon-size) ${iconEffectClass(effects)}`} />
      </button>
    )
  }

  // Not clickable: an image with a name, or pure decoration
  const a11y = label ? { role: 'img', 'aria-label': label, title: label } : { 'aria-hidden': true }
  return (
    <span {...a11y} className={`${ICON_BOX} ${ICON_SHOW[show]} ${ICON_BG[bg ?? 'none']}`}>
      <Icon className="size-(--btn-icon-size)" />
    </span>
  )
}
