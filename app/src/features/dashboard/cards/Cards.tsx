import type { CSSProperties } from 'react'
import { LuFileText, LuMapPin } from 'react-icons/lu'
import { findObject } from '../../../mocks/projects'
import { linksOf, useMockObjects } from '../../../mocks/projectsStore'
import { KIND_ICON } from '../../../mocks/sidebarTree'
import { hueOf, placeholderArt } from '../../objects/placeholderArt'
import CardShell, { type CardProps } from './CardShell'

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

/** A map: a map-like preview (a faint grid and a pin, tinted by its id), its project and links */
function MapCard(props: CardProps) {
  const { object } = props
  const hue = hueOf(object.id)
  const preview: CSSProperties = {
    backgroundColor: `color-mix(in oklch, hsl(${hue} 50% 60%) 14%, var(--surface-muted))`,
    backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
    backgroundSize: '16px 16px',
  }
  const project = object.parentId ? findObject(object.parentId)?.name : undefined
  const links = linksOf(object.id).length
  return (
    <CardShell {...props}>
      {(name) => (
        <>
          <div style={preview} className="flex h-24 shrink-0 items-center justify-center rounded-(--btn-radius)">
            <LuMapPin className="size-7 drop-shadow-sm" style={{ color: `hsl(${hue} 65% 45%)` }} />
          </div>
          <KindName kind="map" name={name} />
          <p className="truncate px-0.5 pe-12 text-small text-fg-subtle">
            {[project, links > 0 ? `${links} linked` : null].filter(Boolean).join(' · ') || 'Map'}
          </p>
        </>
      )}
    </CardShell>
  )
}

/** A note: paper, its name, its text fading out at the bottom */
function NoteCard(props: CardProps) {
  const { object } = props
  return (
    <CardShell {...props} className="bg-note">
      {(name) => (
        <>
          <div className="px-0.5 pe-8 pt-0.5">
            <KindName kind="note" name={name} />
          </div>
          <p className="line-clamp-6 px-0.5 text-small whitespace-pre-wrap text-fg-muted [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
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
                <div key={i} title={articles[i].name} style={placeholderArt(articles[i].id)} className="rounded-[8px]" />
              ) : (
                <div key={i} className="rounded-[8px] border border-dashed border-line-strong" />
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
