import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { LuImageOff } from 'react-icons/lu'
import ButtonLook from '../../../components/ui/buttons/ButtonLook'
import type { AnyResource } from '../../../resources/types'
import type { Entry } from '../../../lib/resource/reorder'
import { hueOf } from '../../objects/placeholderArt'
import { CARD_SIZE, cardOf } from './cardStyles'
import { BOOK, BOOK_FRAME, BOOK_SIZE, BOOK_TITLE, bookAt } from './book'
import BookArt from './BookArt'
import PixelRects from './PixelRects'
import { FRAME_PIXELS, FRAME_SIZE, MAP_INSET, paperMarks, paperPixels } from './mapFrame'
import FolderFace from './FolderFace'
import MapPreview from './MapPreview'
import { DAY_MONTH } from '../../../lib/dates'

/** The picture of an item's card: the first one of its text (when the item has its `content`: a list gives only the preview), else its Info box's picture or its banner (an article) */
function firstImage(item: CardItem): string | null {
  const html = typeof item.content === 'string' ? item.content : ''
  // Else an article's Info box picture, or its banner (a list item has its Info box, not its text)
  const infobox = item.infobox as { banner?: string | null; image?: string | null } | undefined
  return /<img\b[^>]*\bsrc="([^"]+)"/i.exec(html)?.[1] ?? infobox?.image ?? infobox?.banner ?? null
}


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
 * its title, on the cover of a square pixel-art leather book (book.ts: the picture in a one-pixel outline on it, the title under it, the name on the frame's edge, the pages and a ribbon below); `map`, its preview printed on pixel-art old paper in a thin pixel-art wooden frame filling the card (mapFrame.ts), its title in a narrower box hanging below it, centred on its bottom edge; `folder`,
 * its name floating on its top left corner and its first four items as tiles. Only what is inside the box: the real card (ResourceCard) adds drag, menu and zoom, a draft (DraftCard) blurs it.
 * The element of the title carries `data-card-title`, where a draft's title input lands when it is created. What a draft blurs is marked `data-card-body`
 * (the content, never the box with the border), and `data-card-bleed` too when it fills its box to the edge (it is scaled up a little while blurred, so its blurred edge is out of sight).
 */
export default function CardFace({ resource, item, title, contents, dropping, pending, box, className = '', marks }: Props) {
  const Icon = resource.ui.icon
  const created = item.createdAt ? new Date(item.createdAt) : null
  const look = resource.ui.card ?? 'plain'
  const date = created && <span className="shrink-0 text-small text-fg-subtle">{DAY_MONTH.format(created)}</span>
  const subtitle = resource.ui.row.subtitle?.(item) || 'Empty'

  if (look === 'map') {
    const mapBox = { position: 'absolute', inset: `${(MAP_INSET / FRAME_SIZE) * 100}%` } as const
    return (
      // The paper and frame in pixel art (mapFrame.ts): a sheet of old paper with a torn edge in a thin wooden frame; the map (smooth) printed on it, its folds, cracks
      // and stains over it; the name hangs on the frame's bottom edge, centred
      <div {...box} className={`group/card relative shrink-0 snap-start ${CARD_SIZE} ${className}`}>
        <PixelRects rects={paperPixels(String(item.id))} width={FRAME_SIZE} height={FRAME_SIZE} />
        <div data-card-body data-card-bleed style={mapBox}>
          <MapPreview id={String(item.id)} className="size-full" />
        </div>
        <PixelRects rects={paperMarks(String(item.id))} width={FRAME_SIZE} height={FRAME_SIZE} />
        <PixelRects rects={FRAME_PIXELS} width={FRAME_SIZE} height={FRAME_SIZE} className="[filter:drop-shadow(0_3px_0_rgb(0_0_0/0.22))]" />
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
    const frame = BOOK_FRAME
    return (
      // A pixel-art book (book.ts): its picture in a one-pixel outline on the cover, its title under it (no plate, no preview or date); its
      // pages and a ribbon along the bottom. On hover it lifts a little off the shelf
      <div {...box} className={`group/card relative shrink-0 snap-start text-start ${BOOK_SIZE} ${className}`} style={{ color: BOOK.ink }}>
        <div className="absolute inset-0 transition-transform duration-200 ease-out group-hover/card:-translate-y-[3px] motion-reduce:transition-none">
          <BookArt className="[filter:drop-shadow(0_3px_0_rgb(0_0_0/0.22))]" />
          {/* The picture, filling its box inside the one-pixel outline */}
          <div className="overflow-hidden" style={{ ...bookAt(frame.x + 1, frame.y + 1, frame.w - 2, frame.h - 2), backgroundColor: BOOK.picture }}>
            {src ? (
              <img data-card-body data-card-bleed src={src} alt="" className="size-full object-cover" />
            ) : (
              <div data-card-body data-card-bleed className="flex size-full flex-col items-center justify-center gap-1 text-small" style={{ color: BOOK.pictureInk }}>
                <LuImageOff aria-hidden className="size-6 opacity-80" />
                No image found
              </div>
            )}
          </div>
          {/* The title, in the pixel font, on the leather under the picture */}
          <div data-card-title-box className="flex items-center justify-center px-1 text-center" style={bookAt(BOOK_TITLE.x, BOOK_TITLE.y, BOOK_TITLE.w, BOOK_TITLE.h)}>
            <span
              data-card-title
              className="line-clamp-2 font-(family-name:--font-pixel) text-[13px] leading-4 font-medium"
              style={{ textShadow: `0 2px 0 ${BOOK.inkShadow}` }}
            >
              {title}
            </span>
          </div>
        </div>
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
