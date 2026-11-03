// THE kinds of link an article's words can be, in the order the links row shows them: LinkRow draws all of them, the Autolinker's
// panel the ones it can make (all but Message). A new kind is one entry here (and its form in LinkRow, its picker in the Autolinker).
import { LuCornerDownRight, LuFileSymlink, LuLink, LuMessageSquareText, LuUserPlus } from 'react-icons/lu'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import type { LinkKind } from './linkHref'

/** The popouts of the link row: one per kind of link, and the Autolinker's */
export type LinkPopout = 'url' | 'object' | 'msg' | 'jump' | 'follow' | 'auto'
export type LinkKindId = Exclude<LinkPopout, 'auto'>

export type LinkKindInfo = {
  id: LinkKindId
  label: string
  icon: PlainIcon
  /** The links (linkHref.ts) it makes: on one of them its button opens on it */
  kinds: LinkKind[]
  /** What its hover tip says */
  tip: string
  /** Its popout's width when wider than the default */
  width?: string
  /** The Autolinker makes it; `searchable`: its section there has a search button */
  inAutolinker: boolean
  searchable: boolean
}

export const LINK_KINDS: LinkKindInfo[] = [
  { id: 'url', label: 'Link', icon: LuLink, kinds: ['url'], tip: 'Link to a web page', inAutolinker: true, searchable: false },
  {
    id: 'object',
    label: 'Attach Content',
    icon: LuFileSymlink,
    kinds: ['object'],
    tip: 'Link to an article, map, folder or project',
    width: 'w-[28rem]',
    inAutolinker: true,
    searchable: true,
  },
  { id: 'jump', label: 'Jump link', icon: LuCornerDownRight, kinds: ['jump'], tip: 'Jump to a section or a marked place of this article', width: 'w-80', inAutolinker: true, searchable: true },
  {
    id: 'follow',
    label: 'Follow',
    icon: LuUserPlus,
    kinds: ['person', 'project-url'],
    tip: "Send the reader to a person, or to someone's project",
    width: 'w-96',
    inAutolinker: true,
    searchable: true,
  },
  { id: 'msg', label: 'Message', icon: LuMessageSquareText, kinds: ['msg'], tip: 'A message that opens beside the text', inAutolinker: false, searchable: false },
]

/** The kinds the Autolinker's panel offers, in the same order */
export const AUTOLINK_KINDS = LINK_KINDS.filter((k) => k.inAutolinker)
