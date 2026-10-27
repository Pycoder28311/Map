import { useResourceMenu } from '../../lib/resource/actions'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import type { Entry } from '../../lib/resource/reorder'
import type { AnyResource } from '../../resources/types'
import Modal from '../../components/ui/overlays/Modal'
import ItemCard from './ItemCard'

type Props = {
  resource: AnyResource
  item: Record<string, unknown> & { id: number | string }
  /** Everything directly in the folder, in the rows' order */
  entries: Entry[]
  /** What is directly in any folder (a folder card inside shows its tiles) */
  contentsOf: (entry: Entry) => Entry[] | undefined
  /** A card in it was clicked */
  onOpen: (entry: Entry) => void
  onClose: () => void
}

/**
 * A folder, opened: a modal with everything in it as cards (the same cards as the Dashboard's rows), wrapping onto rows. A click on a card
 * opens that item (a folder opens in its place, the others in their editor). The zoom button opens the folder as a page. Only for the folder's own card: the folder's fields are no longer opened by it.
 */
export default function FolderModal({ resource, item, entries, contentsOf, onOpen, onClose }: Props) {
  const { dialogs } = useResourceMenu(resource)
  const open = useOpenLayout()
  return (
    <Modal
      open
      onClose={onClose}
      title={resource.ui.row.title(item) || resource.ui.untitled}
      size="lg"
      // The zoom button, left of the X: the folder as a page of its own (a pane); a little lighter than the surface, so the cards on it are discreet
      zoomable
      onZoom={() => open(single({ type: resource.panelType, id: String(item.id) }))}
      className="bg-[color-mix(in_srgb,var(--surface),var(--fg)_9%)]"
    >
      {entries.length === 0 ? (
        <p className="py-6 text-center text-body text-fg-subtle">Nothing in this folder yet</p>
      ) : (
        <div className="flex flex-wrap gap-lg">
          {entries.map((entry) => (
            <ItemCard key={`${entry.resource.name}:${entry.item.id}`} resource={entry.resource} item={entry.item} contents={contentsOf(entry)} onOpen={() => onOpen(entry)} />
          ))}
        </div>
      )}
      {dialogs}
    </Modal>
  )
}
