import { useDroppable } from '@dnd-kit/core'
import { useState, type ComponentProps } from 'react'
import { LuChevronsDown, LuChevronsUp, LuPlus } from 'react-icons/lu'
import Button from '../../ui/buttons/Button'
import { TREE_ROW_LOOK } from '../../ui/buttons/buttonStyles'
import Divider from '../../ui/Divider'
import type { TreeNode } from '../../ui/tree/types'
import TreeView from '../../ui/tree/TreeView'

/** How many notes show before "Show more" */
const LIMIT = 5

/** The node id of the Notes header as a drop target: dropped there, an object becomes a note (last) */
export const NOTES_END = 'notes-end'

type Props = {
  nodes: TreeNode[]
  /** The tree settings shared by every section (links, icons, rename…) */
  tree: Omit<ComponentProps<typeof TreeView>, 'nodes' | 'label'>
  compact: boolean
  onCreate: () => void
  /** The current drag would land on the header (at the end of Notes) */
  dropAtEnd?: boolean
}

/** The Notes section: objects without a parent or children, the first few, then Show more / less */
export default function SidebarNotes({ nodes, tree, compact, onCreate, dropAtEnd = false }: Props) {
  const [showAll, setShowAll] = useState(false)
  // The header takes drops too (e.g. when there are no notes yet)
  const { setNodeRef } = useDroppable({ id: `row:${NOTES_END}`, data: { zone: 'row', priority: 2, nodeId: NOTES_END, section: 'notes-end' } })
  const hidden = nodes.length - LIMIT
  const shown = showAll || hidden <= 0 ? nodes : nodes.slice(0, LIMIT)

  return (
    <section aria-label="Notes">
      <div ref={setNodeRef} className={`rounded-(--btn-radius) ${dropAtEnd ? 'bg-drop/16 ring-[1.4px] ring-inset ring-drop/55' : ''}`}>
        <Divider label="Notes" labelTo="/notes" action={{ icon: LuPlus, label: 'New note', onClick: onCreate }} compact={compact} className="my-(--divider-gap)" />
      </div>
      {nodes.length === 0 ? (
        // Same height as one row, so the rail keeps its layout
        <p className={`h-[calc(var(--pill-py)*2+1.25rem)] px-(--btn-px) text-small leading-[calc(var(--pill-py)*2+1.25rem)] text-fg-subtle ${compact ? 'opacity-0' : ''}`}>
          No notes yet
        </p>
      ) : (
        <TreeView nodes={shown} label="Notes" {...tree} />
      )}
      {hidden > 0 && (
        <Button
          variant="ghost"
          icon={showAll ? LuChevronsUp : LuChevronsDown}
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          title={showAll ? 'Show less' : `Show ${hidden} more`}
          aria-label={showAll ? 'Show less' : `Show ${hidden} more`}
          className={`mt-1 w-full justify-start overflow-hidden text-fg-muted ${TREE_ROW_LOOK}`}
        >
          {/* Compact (the rail): only the icon, no text at all */}
          {!compact && <span className="whitespace-nowrap">{showAll ? 'Show less' : `Show more (${hidden})`}</span>}
        </Button>
      )}
    </section>
  )
}
