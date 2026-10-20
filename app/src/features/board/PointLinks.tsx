import { useWorkspace } from '../workspace/useWorkspace'
import { parsePanelKey } from '../workspace/layout'
import { LinkName } from './linkName'
import type { BoardObject, Link } from './types'

/** What a point is linked to, as buttons that open it (the modal's and the visitor's view). Nothing when there are none */
export default function PointLinks({ links, board, onShowBoardObject }: { links: Link[]; board: BoardObject[]; onShowBoardObject: (id: number) => void }) {
  const workspace = useWorkspace()
  if (links.length === 0) return null
  const go = (link: Link) => {
    if (link.to === 'board') return onShowBoardObject(link.id)
    // A sidebar link's id is the item's panel key (`note:5`)
    const panel = parsePanelKey(link.id)
    if (panel) workspace.open(panel)
  }
  return (
    <section aria-label="Linked objects" className="flex flex-col gap-1">
      <h3 className="text-small text-fg-muted">Linked</h3>
      <ul className="flex flex-wrap gap-1.5">
        {links.map((link, i) => (
          <li key={i}>
            <button type="button" onClick={() => go(link)} className="cursor-pointer rounded-(--radius-pill) border border-line bg-fill px-3 py-1 text-small hover:bg-surface-sunken">
              <LinkName link={link} board={board} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
