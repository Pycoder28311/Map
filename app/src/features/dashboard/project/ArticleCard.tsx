import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { LuExternalLink, LuPencil, LuPin, LuPinOff, LuTrash2 } from 'react-icons/lu'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import { useResourceMenu } from '../../../lib/resource/actions'
import type { AnyResource } from '../../../resources/types'
import { SKINS, svgUrl, toSvg, type SkinName } from './cardPixels'
import RenameDialog from './RenameDialog'

type Item = Record<string, unknown> & { id: number | string }

/** Each skin's art (cardPixels.ts), drawn once as SVG files (the frame, and the chalice of an article without a picture), and its places
 * and type, as the CSS variables bloodCard.css reads (in art pixels) */
const LOOKS = Object.fromEntries(
  Object.entries(SKINS).map(([name, skin]) => [
    name,
    {
      frame: svgUrl(toSvg(skin.frame(), skin.palette)),
      chalice: svgUrl(toSvg(skin.chalice(), skin.artPalette)),
      style: {
        '--art-width': skin.width,
        '--art-height': skin.height,
        ...Object.fromEntries((['window', 'title', 'text'] as const).flatMap((box) => Object.entries(skin[box]).map(([k, v]) => [`--${box}-${k}`, v]))),
        '--title-size': skin.titleSize,
        '--text-size': skin.textSize,
        '--text-line': skin.lineHeight,
        '--title-colour': skin.titleColour,
        '--text-colour': skin.textColour,
        '--more-top': skin.more.top,
        '--more-right': skin.more.right,
        '--pin-top': skin.pin.top,
        '--pin-left': skin.pin.left,
      } as CSSProperties,
    },
  ]),
) as Record<SkinName, { frame: string; chalice: string; style: CSSProperties }>

/** The card's picture: the article's Info box picture, else its banner (a list item has its Info box, not its text) */
function pictureOf(item: Item): string | null {
  const infobox = item.infobox as { image?: string | null; banner?: string | null } | undefined
  return infobox?.image || infobox?.banner || null
}

/**
 * An article as a Dashboard card in one of the two designs, `skin` (crimson or gold: cardPixels.ts SKINS; styles/bloodCard.css): its pixel-art frame, the article's
 * picture in its window (none: the design's chalice art), its title on the plaque and its first lines under it. A click (or Enter) opens it;
 * the ⋯ at the top right has Open, Rename, Pin / Unpin and Move to Trash.
 */
export default function ArticleCard({ resource, item, onOpen, skin = 'crimson' }: { resource: AnyResource; item: Item; onOpen: () => void; skin?: SkinName }) {
  const look = LOOKS[skin]
  const { actions, attempt, dialogs } = useResourceMenu(resource)
  const [renaming, setRenaming] = useState(false)
  const title = resource.ui.row.title(item)
  const text = resource.ui.row.subtitle?.(item)
  const pinned = resource.ui.row.pinned?.(item) ?? false
  const picture = pictureOf(item)
  const titleField = resource.ui.fields.find((f) => f.heading)?.name ?? 'title'

  const menu: TreeMenuGroup[] = [
    [
      { label: 'Open', icon: LuExternalLink, onClick: onOpen },
      { label: 'Rename', icon: LuPencil, onClick: () => setRenaming(true) },
      { label: pinned ? 'Unpin' : 'Pin', icon: pinned ? LuPinOff : LuPin, onClick: () => void attempt(pinned ? 'unpin it' : 'pin it', () => actions.update(item.id, { pinned: !pinned })) },
    ],
    [{ label: 'Move to Trash', icon: LuTrash2, danger: true, onClick: () => void attempt('move it to the Trash', () => actions.trash(item.id)) }],
  ]

  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <>
      <div role="button" tabIndex={0} aria-label={`Open ${title}`} data-card-id={String(item.id)} data-card-kind="article" onClick={onOpen} onKeyDown={onKey} className={`blood-card blood-card--${skin}`} style={look.style}>
        {/* The picture behind the frame's window; an article without one shows the design's own art */}
        <div className={`blood-card__picture ${picture ? 'blood-card__picture--own' : ''}`}>
          {picture ? <img src={picture} alt="" draggable={false} /> : <img className="blood-card__art" src={look.chalice} alt="" draggable={false} />}
        </div>
        <img className="blood-card__frame" src={look.frame} alt="" draggable={false} />
        <h3 className="blood-card__title">
          <span>{title}</span>
        </h3>
        <p className={`blood-card__text ${text ? '' : 'blood-card__text--empty'}`}>{text || 'No text yet'}</p>

        {pinned && (
          <span className="blood-card__pin" title="Pinned">
            <LuPin aria-hidden className="size-3.5" />
          </span>
        )}
        {/* Its own button: clicking it doesn't open the card */}
        <span className="blood-card__more" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <TreeMenu label={`More: ${title}`} groups={menu} fill />
        </span>
      </div>
      {renaming && (
        <RenameDialog
          title={title === resource.ui.untitled ? '' : title}
          placeholder={resource.ui.untitled}
          onClose={() => setRenaming(false)}
          onSave={(next) => attempt('rename it', () => actions.update(item.id, { [titleField]: next }))}
        />
      )}
      {dialogs}
    </>
  )
}
