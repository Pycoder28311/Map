import { useRef, useState } from 'react'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import { findObject } from '../../mocks/projects'
import { renameObject } from '../../mocks/projectsStore'
import { useObjectActions } from '../objects/useObjectActions'
import MapActions from './MapActions'
import MapPicker from './MapPicker'
import { useWorkspace } from '../workspace/useWorkspace'
import { FLOAT, usePeekShift } from './floating'

/** Top left: the map's name (a click lists the project's maps, MapPicker; Rename in the menu makes it an input: Enter or leaving it renames, Esc undoes), the map's actions, and last its ⋯ menu (the map card's own) */
export default function MapTitleBar({ mapId }: { mapId: string }) {
  const shift = usePeekShift()
  const actions = useObjectActions()
  // Never reaches the tool panel: it is right-aligned (25rem wide with its gaps) or centred (half of it, 13.5rem, plus the gaps)
  const fit = useWorkspace().isPane({ type: 'map', id: mapId })
    ? 'max-w-[calc(100%-25rem)] @5xl:max-w-[calc(50%-13.5rem)]'
    : 'max-w-[calc(100%-25rem)] xl:max-w-[calc(50%-13.5rem)]'
  const object = findObject(mapId)
  // The text while it is being edited; null: not renaming
  const [draft, setDraft] = useState<string | null>(null)
  // Esc: leaving the field must not save what was typed
  const cancelled = useRef(false)
  if (!object) return null

  const commit = () => {
    const name = (draft ?? '').trim()
    if (!cancelled.current && name && name !== object.name) renameObject(object.id, name)
    cancelled.current = false
    setDraft(null)
  }

  return (
    <div data-board-title className={`absolute start-3 top-3 flex h-15 items-center ${fit} gap-1.5 ps-4 pe-2 ${FLOAT} ${shift}`}>
      {draft === null ? (
        <MapPicker mapId={mapId} name={object.name} />
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
      <MapActions mapId={mapId} />
      <TreeMenu
        label={`More: ${object.name}`}
        anchor={() => document.querySelector('[data-board-title]')}
        groups={actions.menuOf(object, {
          panel: { type: 'map', id: object.id },
          onRename: () => setDraft(object.name),
          element: () => document.querySelector('[data-board-title]'),
        })}
      />
      {actions.dialogs}
    </div>
  )
}
