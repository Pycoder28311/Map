import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { LuExternalLink, LuPencil, LuPin, LuPinOff, LuTrash2 } from 'react-icons/lu'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import { useResourceMenu } from '../../../lib/resource/actions'
import type { AnyResource } from '../../../resources/types'
import DEFAULT_ART from '../../../assets/cards/blood-card-art.svg'
import { drawCard, LAYOUT, PALETTE, toPaths } from './cardPixels'
import RenameDialog from './RenameDialog'

type Item = Record<string, unknown> & { id: number | string }

/** The card's pixel art (cardPixels.ts), drawn once: one path per colour */
const PATHS = toPaths(drawCard())

/** Where the picture, title and text go, in art pixels (cardPixels.ts LAYOUT), for bloodCard.css */
const PLACES = Object.fromEntries(
  (['window', 'plaque', 'text'] as const).flatMap((name) => Object.entries(LAYOUT[name]).map(([k, v]) => [`--${name}-${k}`, v])),
) as CSSProperties

/** The frame, plaque and ornaments: the card's pixel art, square pixels at any size */
function CardArt() {
  return (
    <svg aria-hidden className="blood-card__frame" viewBox={`0 0 ${LAYOUT.width} ${LAYOUT.height}`} shapeRendering="crispEdges">
      {PATHS.map(({ colour, d }) => (
        <path key={colour} fill={PALETTE[colour]} d={d} />
      ))}
    </svg>
  )
}

/** The card's picture: the article's Info box picture, else its banner (a list item has its Info box, not its text) */
function pictureOf(item: Item): string | null {
  const infobox = item.infobox as { image?: string | null; banner?: string | null } | undefined
  return infobox?.image || infobox?.banner || null
}

/**
 * An article as a Dashboard card, the crimson card of the design (styles/bloodCard.css): its pixel-art frame (cardPixels.ts), the article's
 * picture in its window (none: the design's chalice art), its title on the plaque and its first lines under it. A click (or Enter) opens it;
 * the ⋯ at the top right has Open, Rename, Pin / Unpin and Move to Trash.
 */
export default function ArticleCard({ resource, item, onOpen }: { resource: AnyResource; item: Item; onOpen: () => void }) {
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
      <div role="button" tabIndex={0} aria-label={`Open ${title}`} data-card-id={String(item.id)} data-card-kind="article" onClick={onOpen} onKeyDown={onKey} className="blood-card" style={PLACES}>
        {/* The picture behind the frame's window; an article without one shows the design's own art */}
        <div className={`blood-card__picture ${picture ? 'blood-card__picture--own' : ''}`}>
          {picture ? <img src={picture} alt="" draggable={false} /> : <img className="blood-card__art" src={DEFAULT_ART} alt="" draggable={false} />}
        </div>
        <CardArt />
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
