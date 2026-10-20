import { parsePanelKey } from '../workspace/layout'
import { useResourceItem } from '../../lib/resource/hooks'
import { resourceByPanelType } from '../../resources/registry'
import type { BoardObject, Link } from './types'

/** An item's name, read through its resource (one request, shared with every screen showing it) */
function ItemName({ panelKey }: { panelKey: string }) {
  const panel = parsePanelKey(panelKey)
  const resource = resourceByPanelType(panel?.type)
  const { item, status } = useResourceItem(resource ?? NONE, resource ? panel?.id : undefined)
  if (!resource || (!item && status !== 'loading')) return <>Missing object</>
  return <>{item ? resource.ui.row.title(item) : '…'}</>
}
const NONE = { name: '', api: { get: async () => ({}) } } as never

/** What a link points at, for the list: the item's name, or the board object's */
export function LinkName({ link, board }: { link: Link; board: BoardObject[] }) {
  if (link.to === 'sidebar') return <ItemName panelKey={link.id} />
  const target = board.find((o) => o.id === link.id)
  return <>{target ? target.name || `${target.kind} ${target.id}` : 'Missing object'}</>
}
