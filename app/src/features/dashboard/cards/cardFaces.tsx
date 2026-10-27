import type { ComponentProps, ReactNode } from 'react'
import { LuImageOff } from 'react-icons/lu'
import ButtonLook from '../../../components/ui/buttons/ButtonLook'
import type { AnyResource } from '../../../resources/types'
import type { Entry } from '../../../lib/resource/reorder'
import { CARD_SIZE, cardOf } from './cardStyles'
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
 * title, date and two lines, in two parts split by a thin line; `map`, its preview filling the card, its title in a narrower box hanging below it, centred on its bottom edge; `folder`,
 * its name floating on its top left corner and its first four items as tiles. Only what is inside the box: the real card (ResourceCard) adds drag, menu and zoom, a draft (DraftCard) blurs it.
 * The element of the title carries `data-card-title`, where a draft's title input lands when it is created.
 */
export default function CardFace({ resource, item, title, contents, dropping, pending, box, className = '', marks }: Props) {
  const Icon = resource.ui.icon
  const created = item.createdAt ? new Date(item.createdAt) : null
  const look = resource.ui.card ?? 'plain'
  const date = created && <span className="shrink-0 text-small text-fg-subtle">{DATE.format(created)}</span>
  const subtitle = resource.ui.row.subtitle?.(item) || 'Empty'

  if (look === 'map') {
    return (
      // The card itself does not clip: the name hangs below the picture (which clips its own corners), centred on its bottom edge
      <div {...box} className={`group/card relative shrink-0 snap-start ${CARD_SIZE} ${className}`}>
        <div className="absolute inset-0 overflow-hidden rounded-(--card-radius) bg-surface shadow-sm ring-1 ring-line">
          <MapPreview id={String(item.id)} className="size-full" />
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
    return (
      // Split in two pieces with a real gap (--spacing-xs) between them, the page showing through: the picture across the top five eighths, the text
      // below, each with its own corners and ring. The name sits on the gap, half over each (outside the pieces, which clip themselves)
      <div {...box} className={`group/card relative flex shrink-0 snap-start flex-col gap-xs text-start ${CARD_SIZE} ${className}`}>
        <div className="h-[62.5%] shrink-0 overflow-hidden rounded-t-(--card-radius) bg-surface shadow-[0_0_10px_rgb(0_0_0/0.14)] ring-1 ring-line">
          {src ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 bg-fg/[0.04] text-small text-fg-subtle/70">
              <LuImageOff aria-hidden className="size-6 opacity-70" />
              No image found
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-1 items-start gap-2 rounded-b-(--card-radius) bg-surface px-2 pt-4 shadow-[0_0_10px_rgb(0_0_0/0.14)] ring-1 ring-line">
          <p className="line-clamp-2 min-w-0 flex-1 text-small text-fg-muted">{subtitle}</p>
          {date}
        </div>
        <ButtonLook
          data-card-title-box
          variant="secondary"
          size="xs"
          icon={Icon}
          className="absolute top-[calc(62.5%+var(--spacing-xs)/2)] left-1/2 z-10 max-w-[85%] min-w-0 -translate-x-1/2 -translate-y-1/2"
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
      // Like a map card: the card itself does not clip; its box does, and the name floats on its top left corner, half outside the border
      <div {...box} className={`group/card relative shrink-0 snap-start ${CARD_SIZE} ${className}`}>
        <div className="absolute inset-0 flex flex-col gap-2 overflow-hidden rounded-(--card-radius) bg-fg/10 p-2 pt-5 shadow-sm ring-1 ring-line">
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
      <div className="flex items-center gap-2 px-0.5 pe-8 pt-0.5">
        <ButtonLook data-card-title-box variant="secondary" size="sm" icon={Icon} className="min-w-0">
          <span data-card-title className="min-w-0 truncate">
            {title}
          </span>
        </ButtonLook>
        {date}
      </div>
      <p className="line-clamp-4 border-s-2 border-fg/20 ps-2 text-body text-fg-muted [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">{subtitle}</p>
      {marks}
    </div>
  )
}
