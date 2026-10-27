import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { LuImageOff } from 'react-icons/lu'
import ButtonLook from '../../../components/ui/buttons/ButtonLook'
import type { AnyResource } from '../../../resources/types'
import type { Entry } from '../../../lib/resource/reorder'
import { hueOf } from '../../objects/placeholderArt'
import { CARD_SIZE, cardOf } from './cardStyles'
import { CRACK_DEPTH, CRACK_REACH, crackedPolygons } from './crack'
import { paperEdgePolygon } from './paperEdge'
import FolderFace from './FolderFace'
import MapPreview from './MapPreview'

/** The first picture of an item's text (its `content`, when the item has it: a list gives only the preview, so then none), if any */
function firstImage(item: CardItem): string | null {
  const html = typeof item.content === 'string' ? item.content : ''
  return /<img\b[^>]*\bsrc="([^"]+)"/i.exec(html)?.[1] ?? null
}

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

export type CardItem = Record<string, unknown> & { id: number | string; createdAt?: string }

type Props = {
  resource: AnyResource
  item: CardItem
  /** What the card is called (a draft: empty) */
  title: string
  /** A folder's first items (its tiles) */
  contents?: Entry[]
  /** An item is over a folder's middle: its dashed square shows (where it would go) */
  dropping?: boolean
  /** A folder: a draft card is being made from it (its dashed tile shows) */
  pending?: boolean
  /** The card's own props: the drag handlers and ref of a real card (none on a draft) */
  box?: ComponentProps<'div'> & { 'data-card-id'?: string; 'data-card-kind'?: string }
  /** The extra classes of the box (a real card's grab cursor, its fade while dragged) */
  className?: string
  /** What sits on the card: the ⋯ menu and the drop bar */
  marks?: ReactNode
}

/**
 * The look of a Dashboard card, by its resource's `ui.card`: `plain`, like a comment: a square paper card, its title and date on top, its preview quoted below
 * behind a thin bar, fading out where it's cut; `image`, a picture on top (a placeholder made from its id: the list has no images), its
 * title, date and two lines, in two parts that touch, the picture going on behind the text part, whose top edge is cracked (crack.ts), the text part a dark box with the fields' inner shadow (.ui-inset); `map`, its preview filling the card with edges like old paper (small cuts, paperEdge.ts), its title in a narrower box hanging below it, centred on its bottom edge; `folder`,
 * its name floating on its top left corner and its first four items as tiles. Only what is inside the box: the real card (ResourceCard) adds drag, menu and zoom, a draft (DraftCard) blurs it.
 * The element of the title carries `data-card-title`, where a draft's title input lands when it is created. What a draft blurs is marked `data-card-body`
 * (the content, never the box with the border), and `data-card-bleed` too when it fills its box to the edge (it is scaled up a little while blurred, so its blurred edge is out of sight).
 */
export default function CardFace({ resource, item, title, contents, dropping, pending, box, className = '', marks }: Props) {
  const Icon = resource.ui.icon
  const created = item.createdAt ? new Date(item.createdAt) : null
  const look = resource.ui.card ?? 'plain'
  const date = created && <span className="shrink-0 text-small text-fg-subtle">{DATE.format(created)}</span>
  const subtitle = resource.ui.row.subtitle?.(item) || 'Empty'

  if (look === 'map') {
    return (
      // The card itself does not clip: the name hangs below the picture (which clips itself to the edges of old paper: uneven, with small cuts,
      // paperEdge.ts; its wrapper draws the outline along that shape), centred on its bottom edge
      <div {...box} className={`group/card relative shrink-0 snap-start ${CARD_SIZE} ${className}`}>
        <div className="ui-crack absolute inset-0">
          <div className="size-full overflow-hidden bg-surface" style={{ clipPath: paperEdgePolygon(`${item.id}:map`) }}>
            <div data-card-body data-card-bleed className="size-full">
              <MapPreview id={String(item.id)} className="size-full" />
            </div>
          </div>
        </div>
        {/* The name: a Stone button's look (like the Recent History button) */}
        <ButtonLook data-card-title-box variant="secondary" size="xs" icon={Icon} className="absolute bottom-0 left-1/2 max-w-[85%] min-w-0 -translate-x-1/2 translate-y-1/2">
          <span data-card-title className="min-w-0 truncate">
            {title}
          </span>
        </ButtonLook>
        {marks}
      </div>
    )
  }

  if (look === 'image') {
    const src = firstImage(item)
    const crack = crackedPolygons(String(item.id))
    return (
      // The picture and the text part touch, with no gap: the picture goes on behind the text part, which lies over it with a cracked top edge
      // (crack.ts), an outline and a shadow that falls on the picture, as if the picture came out from behind it. The name sits on that edge
      <div {...box} className={`group/card relative flex shrink-0 snap-start flex-col text-start ${CARD_SIZE} ${className}`}>
        {/* The picture's box reaches CRACK_DEPTH past the middle of the crack, so it is behind the text part wherever the crack wanders */}
        <div className="ui-crack shrink-0" style={{ height: `calc(62.5% + ${CRACK_DEPTH}px)` }}>
          <div className="size-full overflow-hidden rounded-t-(--card-radius) bg-surface">
            {src ? (
              <img data-card-body data-card-bleed src={src} alt="" className="size-full object-cover" />
            ) : (
              <div data-card-body data-card-bleed className="flex size-full flex-col items-center justify-center gap-1 bg-fg/[0.04] text-small text-fg-subtle/70">
                <LuImageOff aria-hidden className="size-6 opacity-70" />
                No image found
              </div>
            )}
          </div>
        </div>
        <div
          className="ui-crack min-h-0 flex-1 [--crack-blur:7px] [--crack-line:var(--row-border-color)] [--crack-shadow:0.55]"
          style={{ marginTop: -2 * CRACK_DEPTH }}
        >
          <div
            className="ui-inset flex size-full items-start gap-2 rounded-b-(--card-radius) px-2"
            style={{ clipPath: crack.bottom, paddingTop: `calc(0.75rem + ${CRACK_REACH}px)` }}
          >
            <p data-card-body className="line-clamp-2 min-w-0 flex-1 text-small text-fg-muted">
              {subtitle}
            </p>
            {date && <span data-card-body className="shrink-0 text-small text-fg-subtle">{DATE.format(created!)}</span>}
          </div>
        </div>
        <ButtonLook
          data-card-title-box
          variant="secondary"
          size="xs"
          icon={Icon}
          className="absolute top-[62.5%] left-1/2 z-10 max-w-[85%] min-w-0 -translate-x-1/2 -translate-y-1/2"
        >
          <span data-card-title className="min-w-0 truncate">
            {title}
          </span>
        </ButtonLook>
        {marks}
      </div>
    )
  }

  if (look === 'folder') {
    return (
      // Like a map card: the card itself does not clip; its box does, and the name floats on its top left corner, half outside the border. The box is
      // liquid glass (.ui-glass, index.css): frosted, with a soft blurred colour in it, a different one for each folder
      <div {...box} className={`group/card relative shrink-0 snap-start ${CARD_SIZE} ${className}`}>
        <div
          className="ui-glass absolute inset-0 flex flex-col gap-2 overflow-hidden rounded-(--card-radius) p-2 pt-5"
          style={{ '--glass-hue': hueOf(String(item.id)) } as CSSProperties}
        >
          <FolderFace contents={contents ?? []} dropping={dropping} pending={pending} />
        </div>
        <ButtonLook data-card-title-box variant="secondary" size="xs" icon={Icon} className="absolute left-3 top-0 max-w-[80%] min-w-0 -translate-y-1/2">
          <span data-card-title className="min-w-0 truncate">
            {title}
          </span>
        </ButtonLook>
        {marks}
      </div>
    )
  }

  return (
    <div {...box} className={`${cardOf(CARD_SIZE)} bg-note ${className}`}>
      <div data-card-body className="flex items-center gap-2 px-0.5 pe-8 pt-0.5">
        <ButtonLook data-card-title-box variant="secondary" size="sm" icon={Icon} className="min-w-0">
          <span data-card-title className="min-w-0 truncate">
            {title}
          </span>
        </ButtonLook>
        {date}
      </div>
      <p data-card-body className="line-clamp-4 border-s-2 border-fg/20 ps-2 text-body text-fg-muted [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">{subtitle}</p>
      {marks}
    </div>
  )
}
