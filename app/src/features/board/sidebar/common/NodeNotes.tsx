import { useState, type ReactNode } from 'react'
import { LuStickyNote, LuX } from 'react-icons/lu'
import Button from '../../../../components/ui/buttons/Button'
import IconButton from '../../../../components/ui/buttons/IconButton'
import LinkButton from '../../../../components/ui/buttons/LinkButton'
import HoverInfo from '../../../../components/ui/overlays/HoverInfo'
import SearchInput from '../../../../components/ui/fields/SearchInput'
import { useResourceList } from '../../../../lib/resource/hooks'
import { useOptionalItemModal } from '../../../items/ItemModal'
import { toggleNoteLink } from '../../../links/linkPick'
import { byNode, notesResource, useAttachedNotes, type Note } from '../../../notes/attachedNotes'
import { fold } from '../../../search/search'
import { useWorkspace } from '../../../workspace/useWorkspace'

/** How many matching notes the picker lists */
const PICK_MAX = 8

/**
 * The notes attached to this node (docs/plans/38): from the map's one list of notes (read once per open map), each opening in the
 * note modal, with ✕ to detach it. "Connect a note" finds one of the user's notes to attach here (it leaves wherever it was)
 */
export default function NodeNotes({ mapId, objectId, extra, centered = false }: { mapId: string; objectId: number; extra?: ReactNode; centered?: boolean }) {
  const notes = notesResource()
  const attached = useAttachedNotes({ type: 'map', id: Number(mapId) })
  const mine = byNode(attached.items as Note[]).get(objectId) ?? []
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  // The user's notes, read only while the picker is open
  const others = useResourceList(notes, { limit: 20, enabled: picking })
  const itemModal = useOptionalItemModal()
  const workspace = useWorkspace()
  const open = (id: string) => (itemModal ? itemModal.open(notes, id) : workspace.open({ type: notes.panelType, id }))
  const title = (note: Note) => notes.ui.row.title(note)

  const words = fold(query).split(/\s+/).filter(Boolean)
  const ids = new Set(mine.map((n) => String(n.id)))
  const found = (others.items as Note[])
    .filter((n) => !ids.has(String(n.id)) && words.every((w) => fold(`${title(n)} ${String(n.preview ?? '')}`).includes(w)))
    .slice(0, PICK_MAX)

  return (
    <div className="flex flex-col gap-1">
      {mine.length > 0 && (
        <ul aria-label="Notes" className="flex flex-col gap-0.5">
          {mine.map((note) => (
            <li key={String(note.id)} className="flex items-center justify-between gap-2 ps-2 text-body">
              <LuStickyNote aria-hidden className="size-4 shrink-0 text-fg-subtle" />
              <LinkButton className="min-w-0 flex-1 truncate text-start" onClick={() => open(String(note.id))}>
                {title(note)}
              </LinkButton>
              <IconButton icon={LuX} label={`Detach ${title(note)}`} onClick={() => void toggleNoteLink(mapId, objectId, note)} />
            </li>
          ))}
        </ul>
      )}
      {picking ? (
        <div className="flex flex-col gap-1">
          <SearchInput
            autoFocus
            label="Find a note to connect"
            placeholder="Find a note"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return
              e.preventDefault()
              e.stopPropagation()
              setPicking(false)
            }}
          />
          {found.map((note) => (
            <Button key={String(note.id)} variant="ghost" size="sm" icon={LuStickyNote} onClick={() => void toggleNoteLink(mapId, objectId, note)} title={note.attachedType ? 'Moves it here from where it is' : undefined}>
              {title(note)}
            </Button>
          ))}
          {others.status === 'loading' && <p className="ps-2 text-small text-fg-subtle">Loading…</p>}
          {others.status !== 'loading' && found.length === 0 && <p className="ps-2 text-small text-fg-subtle">No note found.</p>}
          <LinkButton className="self-start ps-2" onClick={() => setPicking(false)}>
            Done
          </LinkButton>
        </div>
      ) : (
        // A sortBy2 button with the project's hover card, and `extra` (the form's own button) right after it
        <div className={`flex items-center gap-1 ${centered ? 'justify-center' : ''}`}>
          <HoverInfo title="Connect a note" text="Finds one of your notes and attaches it here. A note is attached to one thing: it leaves wherever it was." side="top" delay={350}>
            <Button
              variant="ghost"
              size="md"
              plain
              // Alone (no Create article beside it): the whole width, bigger text, less padding
              className={extra ? '' : 'min-w-0 flex-1 [--btn-font-size:1.125rem]! [--btn-pad-y:var(--spacing-sm)]!'}
              onClick={() => setPicking(true)}
            >
              Connect a note
            </Button>
          </HoverInfo>
          {extra}
        </div>
      )}
    </div>
  )
}
