import { useState } from 'react'
import { LuFileText } from 'react-icons/lu'
import { findObject } from '../../../mocks/projects'
import { useMockObjects } from '../../../mocks/projectsStore'
import { KIND_ICON } from '../../../mocks/sidebarTree'
import { placeholderArt } from '../../objects/placeholderArt'
import MapPreview from './MapPreview'
import MapZoomModal from './MapZoomModal'
import CardShell, { COMMENT_SIZE, type CardProps } from './CardShell'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

/** A folder card's drop key: an article dropped on it falls into its grid */
export const folderDropKey = (folderId: string) => `folder-card:${folderId}`

/** A small kind icon before a name */
function KindName({ kind, name }: { kind: CardProps['object']['kind']; name: React.ReactNode }) {
  const Icon = KIND_ICON[kind]
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-fg-subtle" />
      {name}
    </span>
  )
}

/** The card for an object, by its kind (each has its own look) */
export default function Card(props: CardProps) {
  switch (props.object.kind) {
    case 'object':
      return <ObjectCard {...props} />
    case 'article':
      return <ArticleCard {...props} />
    case 'map':
      return <MapCard {...props} />
    case 'note':
      return <NoteCard {...props} />
    case 'folder':
      return <FolderCard {...props} />
    default:
      return null
  }
}

/** An object card: its picture, name and date, a two-line description */
function ObjectCard(props: CardProps) {
  const { object } = props
  return (
    <CardShell {...props}>
      {(name) => (
        <>
          <div style={placeholderArt(object.id)} className="h-24 shrink-0 rounded-(--btn-radius)" />
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <KindName kind="object" name={name} />
            <span className="shrink-0 text-small text-fg-subtle">{DATE.format(object.createdAt)}</span>
          </div>
          <p className="line-clamp-2 px-0.5 text-small text-fg-muted">{object.description || 'No description'}</p>
        </>
      )}
    </CardShell>
  )
}

/** An article: a taller cover, its title (two lines), the start of its text */
function ArticleCard(props: CardProps) {
  const { object } = props
  return (
    <CardShell {...props}>
      {(name) => (
        <>
          <div style={placeholderArt(object.id)} className="flex h-28 shrink-0 items-center justify-center rounded-(--btn-radius) text-fg/25">
            <LuFileText className="size-8" />
          </div>
          <div className="line-clamp-2 px-0.5 [&_span]:whitespace-normal">
            <KindName kind="article" name={name} />
          </div>
          <p className="truncate px-0.5 pe-12 text-small text-fg-subtle">{object.text?.split('\n')[0] || 'Empty'}</p>
        </>
      )}
    </CardShell>
  )
}

/** A map: its picture fills the card, its name at the bottom; on hover Open, select, zoom and ⋯ */
function MapCard(props: CardProps) {
  const { object } = props
  const [zoomed, setZoomed] = useState(false)
  return (
    <>
      <CardShell {...props} variant="media" onZoom={() => setZoomed(true)}>
        {() => <MapPreview id={object.id} className="size-full" />}
      </CardShell>
      <MapZoomModal object={object} open={zoomed} onClose={() => setZoomed(false)} />
    </>
  )
}

/**
 * A note, as a comment: a wide paper card (the Notes row's), its title and date on top, its text quoted
 * below it behind a thin bar, fading out where it's cut
 */
function NoteCard(props: CardProps) {
  const { object } = props
  return (
    <CardShell {...props} size={COMMENT_SIZE} className="bg-note">
      {(name) => (
        <>
          <div className="flex items-baseline gap-2 px-0.5 pe-8 pt-0.5">
            <KindName kind="note" name={name} />
            <span className="shrink-0 text-small text-fg-subtle">{DATE.format(object.createdAt)}</span>
          </div>
          <p className="line-clamp-4 border-s-2 border-fg/20 ps-2 text-body whitespace-pre-wrap text-fg-muted [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
            {object.text || 'Empty note'}
          </p>
        </>
      )}
    </CardShell>
  )
}

/** A folder: its name, its first 4 articles' pictures in a 2×2 grid, how many it holds */
function FolderCard(props: CardProps) {
  const { object } = props
  const objects = useMockObjects()
  const articles = objects.filter((o) => o.parentId === object.id && findObject(o.id))
  return (
    <CardShell {...props}>
      {(name) => (
        <>
          <div className="px-0.5 pe-8 pt-0.5">
            <KindName kind="folder" name={name} />
          </div>
          {/* Where a dropped article falls in (fallInto) */}
          <div data-drop-icon={folderDropKey(object.id)} className="grid flex-1 grid-cols-2 grid-rows-2 gap-1.5">
            {[0, 1, 2, 3].map((i) =>
              articles[i] ? (
                <div key={i} title={articles[i].name} style={placeholderArt(articles[i].id)} className="rounded-(--corner-sm)" />
              ) : (
                <div key={i} className="rounded-(--corner-sm) border border-dashed border-line-strong" />
              ),
            )}
          </div>
          <p className="px-0.5 text-small text-fg-subtle">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'}
          </p>
        </>
      )}
    </CardShell>
  )
}
