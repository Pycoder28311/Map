import { useState } from 'react'
import { LuCornerUpRight } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import { useWorkspace } from '../workspace/useWorkspace'
import { parsePanelKey } from '../workspace/layout'
import { LinkName } from './linkName'
import type { BoardObject, Link } from './types'

type Props = {
  object: BoardObject
  /** Another object of this board was picked from the list: show it */
  onShowBoardObject: (id: number) => void
}

/** The "see linked object" icon beside the name: one link opens it beside the map, several show a list to pick from. Nothing without links */
export default function ForwardLink({ object, onShowBoardObject, board }: Props & { board: BoardObject[] }) {
  const workspace = useWorkspace()
  const [list, setList] = useState(false)
  const links = object.links
  if (links.length === 0) return null

  const go = (link: Link) => {
    setList(false)
    if (link.to === 'board') return onShowBoardObject(link.id)
    // A sidebar link's id is the item's panel key (`note:5`)
    const panel = parsePanelKey(link.id)
    if (panel) workspace.open(panel)
  }

  return (
    <span className="relative">
      <HoverInfo title="See linked object" text={links.length === 1 ? <LinkName link={links[0]} board={board} /> : `${links.length} linked objects`} side="bottom">
        <IconButton icon={LuCornerUpRight} label="See linked object" aria-expanded={links.length > 1 ? list : undefined} onClick={() => (links.length === 1 ? go(links[0]) : setList(!list))} />
      </HoverInfo>
      {list && (
        <ul className="absolute end-0 top-full z-10 mt-1 flex min-w-40 flex-col rounded-(--card-radius) border border-line bg-surface p-1 shadow-lg">
          {links.map((link, i) => (
            <li key={i}>
              <button type="button" onClick={() => go(link)} className="w-full cursor-pointer truncate rounded-(--corner-sm) px-2 py-1 text-start text-body hover-fill">
                <LinkName link={link} board={board} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
