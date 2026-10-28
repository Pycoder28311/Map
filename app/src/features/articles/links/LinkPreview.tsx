// What a link shows of where it goes: its name (the autolinker's list) and its preview (the card over a hovered link). The one place that
// knows how to read each kind's target: when the server can tell more (an outside page's picture and text), `useLinkInfo` asks it.
import { previewOf, type Infobox } from '@map/shared'
import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { LuBookmark, LuExternalLink, LuFolderOpen, LuMessageSquareText, LuUser } from 'react-icons/lu'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import { useResourceItem } from '../../../lib/resource/hooks'
import { resourceByPanelType } from '../../../resources/registry'
import MapPreview from '../../dashboard/cards/MapPreview'
import { placeholderArt } from '../../objects/placeholderArt'
import { personById } from '../../people/mockPeople'
import PersonCard from '../../people/PersonCard'
import { resolveJump } from './jumpTargets'
import type { ArticleLink } from './linkHref'

// An empty resource for when a link names none (the hook then asks nothing), as ShareOptions has it
const NONE = { name: '', api: { get: async () => ({}) } } as never

type Info = {
  icon: PlainIcon
  /** What it is called */
  title: string
  /** The start of its text */
  text?: string
  /** Its picture (or a placeholder) */
  picture?: ReactNode
  /** It is gone, or can't be read */
  missing?: boolean
}

const firstImage = (html: string) => /<img\b[^>]*\bsrc="([^"]+)"/i.exec(html)?.[1] ?? null
const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** A placeholder picture with the kind's icon on it */
function Placeholder({ seed, icon: Icon }: { seed: string; icon: PlainIcon }) {
  return (
    <div style={placeholderArt(seed)} className="flex size-full items-center justify-center">
      <Icon className="size-8 text-fg-subtle" />
    </div>
  )
}

/** Where a link goes, as it can be shown: read from the app for its objects, from the text for jumps, from the link itself for the rest */
export function useLinkInfo(link: ArticleLink, editor: Editor | null, words = ''): Info {
  const object = link.kind === 'object' ? link : null
  const resource = object ? resourceByPanelType(object.type) : undefined
  const { item, notFound, error } = useResourceItem(resource ?? NONE, resource ? object?.id : undefined)

  switch (link.kind) {
    case 'object': {
      const icon = resource?.ui.icon ?? LuFolderOpen
      if (!resource || notFound) return { icon, title: 'This is gone', missing: true }
      if (!item) return { icon, title: error ? 'Could not be read' : 'Loading…', missing: !!error }
      const record = item as Record<string, unknown> & { id: number | string }
      const content = String(record.content ?? record.description ?? '')
      const infobox = record.infobox as Infobox | undefined
      const image = infobox?.image ?? infobox?.banner ?? firstImage(content)
      const picture =
        link.type === 'map' ? (
          <MapPreview id={String(record.id)} className="size-full" pin="size-6" />
        ) : image ? (
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <Placeholder seed={`${link.type}:${record.id}`} icon={icon} />
        )
      return { icon, title: resource.ui.row.title(record), text: previewOf(content, 160), picture }
    }
    case 'url':
    case 'project-url':
      return {
        icon: link.kind === 'url' ? LuExternalLink : LuFolderOpen,
        title: words || domainOf(link.url),
        text: link.kind === 'url' ? domainOf(link.url) : `Someone's project · ${domainOf(link.url)}`,
        picture: <Placeholder seed={domainOf(link.url)} icon={link.kind === 'url' ? LuExternalLink : LuFolderOpen} />,
      }
    case 'msg':
      return { icon: LuMessageSquareText, title: link.title || 'Message', text: previewOf(link.content, 160) }
    case 'jump': {
      const target = editor ? resolveJump(editor.state.doc, link.to) : null
      if (!editor || !target) return { icon: LuBookmark, title: 'The place is gone', missing: true }
      const after = editor.state.doc.textBetween(target.end, Math.min(target.end + 400, editor.state.doc.content.size), ' ', ' ')
      return { icon: LuBookmark, title: target.text || 'Untitled section', text: previewOf(after, 160) }
    }
    case 'person': {
      const person = personById(link.personId)
      return person ? { icon: LuUser, title: person.name, text: `@${person.handle}` } : { icon: LuUser, title: 'Unknown person', missing: true }
    }
    case 'anchor':
      return { icon: LuBookmark, title: words || 'Marked place' }
  }
}

/** A link's target in a line: its icon and name (the autolinker's list) */
export function LinkTargetName({ link, editor }: { link: ArticleLink; editor: Editor | null }) {
  const info = useLinkInfo(link, editor)
  const Icon = info.icon
  return (
    <span className={`flex min-w-0 items-center gap-1 text-small ${info.missing ? 'text-danger' : 'text-fg-muted'}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{info.title}</span>
    </span>
  )
}

/** The card over a hovered link: its picture and the start of its text; a person's card for a person */
export default function LinkPreview({ link, editor, words }: { link: ArticleLink; editor: Editor | null; words: string }) {
  const info = useLinkInfo(link, editor, words)
  const person = link.kind === 'person' ? personById(link.personId) : null
  if (person) return <PersonCard person={person} />
  const Icon = info.icon
  return (
    <div className="flex w-64 max-w-full flex-col gap-2">
      {info.picture && <div className="aspect-[16/9] w-full overflow-hidden rounded-(--corner-sm) bg-fill">{info.picture}</div>}
      <p className={`flex min-w-0 items-center gap-1.5 text-body font-medium ${info.missing ? 'text-danger' : ''}`}>
        <Icon className="size-4 shrink-0 text-fg-subtle" />
        <span className="truncate">{info.title}</span>
      </p>
      {info.text && <p className="line-clamp-4 text-small whitespace-pre-line text-fg-muted">{info.text}</p>}
    </div>
  )
}
