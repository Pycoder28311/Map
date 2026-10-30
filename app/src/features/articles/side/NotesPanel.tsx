import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { LuExternalLink, LuLink, LuPlus, LuStickyNote, LuTrash2, LuUnlink } from 'react-icons/lu'
import IconButton from '../../../components/ui/buttons/IconButton'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import SearchInput from '../../../components/ui/fields/SearchInput'
import TextField from '../../../components/ui/fields/TextField'
import ResourceDeleteDialog from '../../../components/ui/resource/ResourceDeleteDialog'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import { useResourceActions, useResourceItem, useResourceList } from '../../../lib/resource/hooks'
import { resourceByName } from '../../../resources/registry'
import type { AnyResource } from '../../../resources/types'
import { useOptionalItemModal } from '../../items/ItemModal'
import CardFace from '../../dashboard/cards/cardFaces'
import { ON_HOVER } from '../../dashboard/cards/cardStyles'
import { fold } from '../../search/search'
import { useWorkspace } from '../../workspace/useWorkspace'
import { useArticleNotes } from './articleNotes'

type Note = Record<string, unknown> & { id: number | string }
type Row = { id: string; title: string }

const rowOf = (notes: AnyResource, item: Note): Row => ({ id: String(item.id), title: notes.ui.row.title(item) })

/** A note as the Dashboard shows it (the shared CardFace, its look from the resource), opening on a click, its actions in the card's ⋯ */
function NoteCard({ notes, item, menu, onOpen }: { notes: AnyResource; item: Note; menu: TreeMenuGroup[]; onOpen: () => void }) {
  const title = notes.ui.row.title(item)
  return (
    <CardFace
      resource={notes}
      item={item}
      title={title}
      className="cursor-pointer"
      box={{ role: 'button', tabIndex: 0, 'aria-label': title, 'data-card-id': String(item.id), onClick: onOpen, onKeyDown: (e) => e.key === 'Enter' && e.target === e.currentTarget && onOpen() }}
      marks={
        // Its own menu: clicking it doesn't open the card
        <div onClick={(e) => e.stopPropagation()} className={`absolute end-2 top-2 flex ${ON_HOVER}`}>
          <TreeMenu label={`More: ${title}`} groups={menu} />
        </div>
      }
    />
  )
}

/** The cards of notes in one horizontal row */
function CardRow({ children }: { children: ReactNode }) {
  return <div className="flex snap-x gap-2 overflow-x-auto pb-1">{children}</div>
}

/** A connected note, read by its id; one that is gone is disconnected */
function ConnectedNote({ notes, id, onOpen, onDisconnect, onDelete }: { notes: AnyResource; id: string; onOpen: () => void; onDisconnect: () => void; onDelete: (row: Row) => void }) {
  const { item, notFound } = useResourceItem(notes, id)
  useEffect(() => {
    if (notFound) onDisconnect()
  }, [notFound, onDisconnect])
  if (!item) return <p className="w-48 shrink-0 px-2 py-1 text-small text-fg-subtle">{notFound ? 'Gone' : 'Loading…'}</p>
  const row = rowOf(notes, item as Note)
  return (
    <NoteCard
      notes={notes}
      item={item as Note}
      onOpen={onOpen}
      menu={[[{ label: 'Open', icon: LuExternalLink, onClick: onOpen }, { label: 'Disconnect', icon: LuUnlink, onClick: onDisconnect }], [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: () => onDelete(row) }]]}
    />
  )
}

/**
 * Notes (the round button on the body's left edge): the notes connected to this article, a way to make a new one (connected at once), then
 * all the other notes, to connect. Each opens in the note modal, where it is edited; it can be disconnected or deleted. The connections
 * are on this device for now (articleNotes.ts); the notes are the real ones
 */
export default function NotesPanel({ articleId }: { articleId: string }) {
  const notes = resourceByName('notes')!
  const { ids, connect, disconnect } = useArticleNotes(articleId)
  const actions = useResourceActions(notes)
  const others = useResourceList(notes, { limit: 20 })
  const itemModal = useOptionalItemModal()
  const workspace = useWorkspace()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = (id: string) => (itemModal ? itemModal.open(notes, id) : workspace.open({ type: notes.panelType, id }))
  const create = async (e: FormEvent) => {
    e.preventDefault()
    const name = title.trim()
    if (!name) return
    setError(null)
    try {
      const note = (await actions.create({ title: name } as never)) as Note
      connect(String(note.id))
      setTitle('')
      open(String(note.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The note could not be made.')
    }
  }

  const words = fold(query).split(/\s+/).filter(Boolean)
  const rest = (others.items as Note[]).filter((item) => !ids.includes(String(item.id)) && words.every((w) => fold(`${notes.ui.row.title(item)} ${String(item.preview ?? item.content ?? '')}`).includes(w)))

  return (
    <section aria-label="Notes" className="flex flex-col gap-2 rounded-(--card-radius) border border-line bg-surface p-2 shadow-sm">
      <h2 className="flex items-center gap-1.5 px-1 text-small font-medium text-fg-muted">
        <LuStickyNote className="size-4" />
        Notes of this article ({ids.length})
      </h2>
      {ids.length === 0 ? (
        <p className="px-1 text-small text-fg-subtle">None yet: make one, or connect one of yours below.</p>
      ) : (
        <CardRow>
          {ids.map((id) => (
            <ConnectedNote key={id} notes={notes} id={id} onOpen={() => open(id)} onDisconnect={() => disconnect(id)} onDelete={setDeleting} />
          ))}
        </CardRow>
      )}

      <form className="flex items-end gap-1" onSubmit={(e) => void create(e)}>
        <TextField label="New note" placeholder="Its title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="min-w-0 flex-1" />
        <IconButton type="submit" icon={LuPlus} label="Make the note" variant="primary" disabled={!title.trim()} />
      </form>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1 border-t border-line pt-2">
        <h3 className="px-1 text-small font-medium text-fg-muted">Other notes</h3>
        <SearchInput label="Search notes" value={query} onChange={(e) => setQuery(e.target.value)} />
        <CardRow>
          {rest.map((item) => {
            const row = rowOf(notes, item)
            return (
              <NoteCard
                key={row.id}
                notes={notes}
                item={item}
                onOpen={() => open(row.id)}
                menu={[[{ label: 'Open', icon: LuExternalLink, onClick: () => open(row.id) }, { label: 'Connect', icon: LuLink, onClick: () => connect(row.id) }], [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: () => setDeleting(row) }]]}
              />
            )
          })}
          {others.status === 'loading' && <p className="px-2 py-1 text-small text-fg-subtle">Loading…</p>}
          {others.status !== 'loading' && rest.length === 0 && !others.hasMore && <p className="px-2 py-1 text-small text-fg-subtle">{query ? 'Nothing found.' : 'No other notes.'}</p>}
        </CardRow>
        {others.hasMore && (
          <LinkButton onClick={others.loadMore} className="ms-1 self-start">
            {others.loadingMore ? 'Loading…' : 'Load more'}
          </LinkButton>
        )}
      </div>
      {deleting && <ResourceDeleteDialog resource={notes} item={deleting} onClose={() => setDeleting(null)} onDeleted={() => disconnect(deleting.id)} />}
    </section>
  )
}
