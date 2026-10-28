import { previewOf } from '@map/shared'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { LuLink, LuPlus, LuStickyNote, LuTrash2, LuUnlink } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import SearchInput from '../../../components/ui/fields/SearchInput'
import TextField from '../../../components/ui/fields/TextField'
import ResourceDeleteDialog from '../../../components/ui/resource/ResourceDeleteDialog'
import { useResourceActions, useResourceItem, useResourceList } from '../../../lib/resource/hooks'
import { resourceByName } from '../../../resources/registry'
import type { AnyResource } from '../../../resources/types'
import { useOptionalItemModal } from '../../items/ItemModal'
import { fold } from '../../search/search'
import { useWorkspace } from '../../workspace/useWorkspace'
import { useArticleNotes } from './articleNotes'

type Note = Record<string, unknown> & { id: number | string }
type Row = { id: string; title: string; preview: string }

const rowOf = (notes: AnyResource, item: Note): Row => ({ id: String(item.id), title: notes.ui.row.title(item), preview: previewOf(String(item.content ?? item.preview ?? ''), 80) })

/** A note's row: its title and start (opens it), and its actions at the right */
function NoteRow({ row, onOpen, actions }: { row: Row; onOpen: () => void; actions: ReactNode }) {
  return (
    <li className="flex items-start gap-0.5">
      <Button variant="ghost" size="sm" plain icon={LuStickyNote} className="h-auto! min-w-0 flex-1 justify-start" onClick={onOpen}>
        <span className="flex min-w-0 flex-col items-start py-0.5 text-start">
          <span className="w-full truncate">{row.title}</span>
          {row.preview && <span className="line-clamp-2 text-small font-normal text-fg-subtle">{row.preview}</span>}
        </span>
      </Button>
      {actions}
    </li>
  )
}

/** A connected note, read by its id; one that is gone is disconnected */
function ConnectedNote({ notes, id, onOpen, onDisconnect, onDelete }: { notes: AnyResource; id: string; onOpen: () => void; onDisconnect: () => void; onDelete: (row: Row) => void }) {
  const { item, notFound } = useResourceItem(notes, id)
  useEffect(() => {
    if (notFound) onDisconnect()
  }, [notFound, onDisconnect])
  if (!item) return <li className="px-2 py-1 text-small text-fg-subtle">{notFound ? 'Gone' : 'Loading…'}</li>
  const row = rowOf(notes, item as Note)
  return (
    <NoteRow
      row={row}
      onOpen={onOpen}
      actions={
        <>
          <IconButton icon={LuUnlink} label={`Disconnect: ${row.title}`} size="sm" onClick={onDisconnect} />
          <IconButton icon={LuTrash2} label={`Delete: ${row.title}`} size="sm" onClick={() => onDelete(row)} />
        </>
      }
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
  const rest = (others.items as Note[])
    .map((item) => rowOf(notes, item))
    .filter((row) => !ids.includes(row.id) && words.every((w) => fold(`${row.title} ${row.preview}`).includes(w)))

  return (
    <section aria-label="Notes" className="flex flex-col gap-2 rounded-(--card-radius) border border-line bg-surface p-2 shadow-sm">
      <h2 className="flex items-center gap-1.5 px-1 text-small font-medium text-fg-muted">
        <LuStickyNote className="size-4" />
        Notes of this article ({ids.length})
      </h2>
      {ids.length === 0 ? (
        <p className="px-1 text-small text-fg-subtle">None yet: make one, or connect one of yours below.</p>
      ) : (
        <ul className="flex flex-col">
          {ids.map((id) => (
            <ConnectedNote key={id} notes={notes} id={id} onOpen={() => open(id)} onDisconnect={() => disconnect(id)} onDelete={setDeleting} />
          ))}
        </ul>
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
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {rest.map((row) => (
            <NoteRow
              key={row.id}
              row={row}
              onOpen={() => open(row.id)}
              actions={
                <>
                  <IconButton icon={LuLink} label={`Connect: ${row.title}`} size="sm" onClick={() => connect(row.id)} />
                  <IconButton icon={LuTrash2} label={`Delete: ${row.title}`} size="sm" onClick={() => setDeleting(row)} />
                </>
              }
            />
          ))}
          {others.status === 'loading' && <li className="px-2 py-1 text-small text-fg-subtle">Loading…</li>}
          {others.status !== 'loading' && rest.length === 0 && !others.hasMore && <li className="px-2 py-1 text-small text-fg-subtle">{query ? 'Nothing found.' : 'No other notes.'}</li>}
        </ul>
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
