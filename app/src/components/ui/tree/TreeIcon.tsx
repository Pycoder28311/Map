import { ICON_BG, ICON_BOX, ICON_BUTTON, ICON_SHOW } from './treeIconStyles'
import TreeMenu from './TreeMenu'
import type { TreeRightIcon } from './types'

/** One icon on the right of a tree row, from its settings (TreeRightIcon in types.ts) */
export default function TreeIcon(props: TreeRightIcon) {
  const { show = 'always', bg } = props

  // A menu of actions below it (its own ⋯ trigger)
  if (props.menu) return <TreeMenu label={props.label} show={show} bg={bg} items={props.menu} />

  const { icon: Icon, label, onClick } = props
  const glyph = <Icon className="size-(--btn-icon-size)" />

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={`${ICON_BOX} ${ICON_SHOW[show]} ${ICON_BG[bg ?? 'hover']} ${ICON_BUTTON}`}
      >
        {glyph}
      </button>
    )
  }

  // Not clickable: an image with a name, or pure decoration
  const a11y = label ? { role: 'img', 'aria-label': label, title: label } : { 'aria-hidden': true }
  return (
    <span {...a11y} className={`${ICON_BOX} ${ICON_SHOW[show]} ${ICON_BG[bg ?? 'none']}`}>
      {glyph}
    </span>
  )
}
