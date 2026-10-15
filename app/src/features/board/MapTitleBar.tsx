import { useRef, useState } from 'react'
import { LuPencil } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { findObject } from '../../mocks/projects'
import { renameObject } from '../../mocks/projectsStore'
import MapActions from './MapActions'
import MapPicker from './MapPicker'
import { useWorkspace } from '../workspace/useWorkspace'
import { FLOAT, ROUNDER, usePeekShift } from './floating'

/** Top left: the map's name (a click lists the project's maps, MapPicker; its pencil makes it an input: Enter or leaving it renames, Esc undoes), the map's actions (branches, layers, screenshot, share) */
export default function MapTitleBar({ mapId, onPickObject }: { mapId: string; onPickObject: (id: number) => void }) {
  const shift = usePeekShift()
  // Never reaches the tool panel: it is right-aligned (25rem wide with its gaps) or centred (half of it, 13.5rem, plus the gaps)
  const fit = useWorkspace().isPane({ type: 'map', id: mapId })
    ? 'max-w-[calc(100%-25rem)] @5xl:max-w-[calc(50%-13.5rem)]'
    : 'max-w-[calc(100%-25rem)] xl:max-w-[calc(50%-13.5rem)]'
  const object = findObject(mapId)
  // The big name is the map's own (the first map of its branch group), whichever branch is open; the branch has its own button
  const title = findObject(object?.branchOf) ?? object
  // The text while it is being edited; null: not renaming
  const [draft, setDraft] = useState<string | null>(null)
  // Esc: leaving the field must not save what was typed
  const cancelled = useRef(false)
  if (!object || !title) return null

  const commit = () => {
    const name = (draft ?? '').trim()
    if (!cancelled.current && name && name !== title.name) renameObject(title.id, name)
    cancelled.current = false
    setDraft(null)
  }

  return (
    <div data-board-title className={`absolute start-3 top-3 flex h-12.5 items-center ${fit} ps-2 pe-2 ${FLOAT} ${ROUNDER} ${shift}`}>
      {draft === null ? (
        // Both in one grid cell (no positioning: the picker's popover hangs from the bar): the pencil shows over the name's end while hovered
        <div className="group grid">
          <div className="col-start-1 row-start-1 min-w-0">
            <MapPicker mapId={mapId} name={title.name} />
          </div>
          <span className="pointer-events-none col-start-1 row-start-1 self-center justify-self-end rounded-(--btn-close-radius) bg-surface/70 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
            <IconButton icon={LuPencil} label="Rename" onClick={() => setDraft(title.name)} />
          </span>
        </div>
      ) : (
        <input
          autoFocus
          value={draft}
          aria-label="Map name"
          size={Math.min(Math.max(draft.length, 4), 28)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              cancelled.current = true
              e.currentTarget.blur()
            }
          }}
          className="min-w-0 rounded-(--btn-close-radius) bg-transparent text-heading outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
      )}
      <MapActions mapId={mapId} onPickObject={onPickObject} />
    </div>
  )
}
