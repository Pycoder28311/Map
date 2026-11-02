import { useState } from 'react'
import { LuExternalLink, LuLink, LuStickyNote, LuUnlink } from 'react-icons/lu'
import LinkButton from '../../components/ui/buttons/LinkButton'
import SearchInput from '../../components/ui/fields/SearchInput'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../components/ui/tree/types'
import { useResourceList } from '../../lib/resource/hooks'
import { resourceByName } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { useOptionalItemModal } from '../items/ItemModal'
import { attachNote, byNode, useAttachedNotes, type Note } from '../notes/attachedNotes'
import { fold } from '../search/search'
import { useWorkspace } from '../workspace/useWorkspace'
import { FLOAT } from './floating'
import { useBoard } from './boardStore'
import { layerLabel } from './layers'

/** One note, a card of its own like a search result: its name and the start of its text; a click opens it, its actions are in the ⋯ */
function NoteRow({ notes, item, menu, onOpen }: { notes: AnyResource; item: Note; menu: TreeMenuGroup[]; onOpen: () => void }) {
  const title = notes.ui.row.title(item)
  const preview = String(item.preview ?? '')
  return (
    <li className={`pointer-events-auto relative shrink-0 ${FLOAT}`}>
      <button type="button" aria-label={title} onClick={onOpen} className="flex w-full cursor-pointer items-center gap-3 rounded-(--card-radius) p-3 pe-12 text-start hover-fill">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-(--radius-pill) bg-fill">
          <LuStickyNote className="size-5 text-fg-muted" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium">{title}</span>
          {preview && <span className="block truncate text-small text-fg-muted">{preview}</span>}
        </span>
      </button>
      <div className="absolute end-2 top-1/2 -translate-y-1/2">
        <TreeMenu label={`More: ${title}`} groups={menu} />
      </div>
    </li>
  )
}

/**
 * The Notes of the left panel, under the title bar (like the search): the notes attached to this map (docs/plans/38), each a card of
 * its own (no background behind them, the map shows between them): the map's own first, then each node's under its name. Under the
 * field, another of the user's notes to connect: one attached somewhere else moves here. A note opens in the note modal. The map's
 * notes are read once per open map (the same list the nodes' links use). Esc closes the panel
 */
export default function MapNotesPanel({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const notes = resourceByName('notes')!
  const board = useBoard(mapId)
  const map = { type: 'map' as const, id: Number(mapId) }
  const attached = useAttachedNotes(map)
  const mine = attached.items as Note[]
  const others = useResourceList(notes, { limit: 20 })
  const itemModal = useOptionalItemModal()
  const workspace = useWorkspace()
  const [query, setQuery] = useState('')

  const open = (id: string) => (itemModal ? itemModal.open(notes, id) : workspace.open({ type: notes.panelType, id }))
  const detach = (id: string) => void attachNote(id, null)
  const words = fold(query).split(/\s+/).filter(Boolean)
  const ids = new Set(mine.map((n) => String(n.id)))
  const rest = (others.items as Note[]).filter((item) => !ids.has(String(item.id)) && words.every((w) => fold(`${notes.ui.row.title(item)} ${String(item.preview ?? item.content ?? '')}`).includes(w)))
  // The map's own notes first, then the nodes' in the board's order
  const groups = [...byNode(mine)].sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a - b))
  const nodeName = (node: number) => {
    const object = board.objects.find((o) => o.id === node)
    return object ? layerLabel(object, board) : 'Deleted object'
  }
  const rowOf = (item: Note) => (
    <NoteRow
      key={String(item.id)}
      notes={notes}
      item={item}
      onOpen={() => open(String(item.id))}
      menu={[[{ label: 'Open', icon: LuExternalLink, onClick: () => open(String(item.id)) }, { label: 'Disconnect', icon: LuUnlink, onClick: () => detach(String(item.id)) }]]}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm">
      <div className="pointer-events-auto shrink-0">
        <SearchInput
          autoFocus
          label="Find a note to connect"
          placeholder="Find a note to connect"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            e.preventDefault()
            e.stopPropagation()
            if (query) setQuery('')
            else onClose()
          }}
          className="w-full"
        />
      </div>
      <ul aria-label="Notes of this map" className="pointer-events-auto -mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1">
        {query ? (
          <>
            {rest.map((item) => (
              <NoteRow
                key={String(item.id)}
                notes={notes}
                item={item}
                onOpen={() => open(String(item.id))}
                menu={[
                  [
                    // One thing at a time: a note attached somewhere else leaves it
                    { label: item.attachedType ? 'Connect (moves it here)' : 'Connect', icon: LuLink, onClick: () => void attachNote(item.id, { ...map, node: null }) },
                    { label: 'Open', icon: LuExternalLink, onClick: () => open(String(item.id)) },
                  ],
                ]}
              />
            ))}
            {rest.length === 0 && <li className={`p-4 text-body text-fg-muted ${FLOAT}`}>{others.status === 'loading' ? 'Loading…' : `No other note matches “${query.trim()}”.`}</li>}
            {others.hasMore && (
              <li>
                <LinkButton onClick={others.loadMore}>{others.loadingMore ? 'Loading…' : 'Load more'}</LinkButton>
              </li>
            )}
          </>
        ) : attached.status === 'loading' ? (
          <li className={`p-4 text-body text-fg-subtle ${FLOAT}`}>Loading…</li>
        ) : mine.length === 0 ? (
          <li className={`p-4 text-body text-fg-muted ${FLOAT}`}>No notes connected to this map yet: find one above to connect it.</li>
        ) : (
          groups.map(([node, list]) => (
            <li key={node ?? 'map'} className="flex shrink-0 flex-col gap-2">
              {node !== null && <h3 className="px-2 pt-1 text-small font-medium text-fg-muted drop-shadow-sm">{nodeName(node)}</h3>}
              <ul className="flex flex-col gap-2">{list.map(rowOf)}</ul>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
