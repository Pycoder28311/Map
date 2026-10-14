import { useRef, useState } from 'react'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import { findObject } from '../../mocks/projects'
import { renameObject } from '../../mocks/projectsStore'
import { useObjectActions } from '../objects/useObjectActions'
import { FLOAT, usePeekShift } from './floating'

/** Top left: the map's name (an input: Enter or leaving it renames, Esc undoes) and its ⋯ menu, the map card's own */
export default function MapTitleBar({ mapId }: { mapId: string }) {
  const shift = usePeekShift()
  const actions = useObjectActions()
  const object = findObject(mapId)
  // The text while it is being edited; null: showing the saved name
  const [draft, setDraft] = useState<string | null>(null)
  // Esc: leaving the field must not save what was typed
  const cancelled = useRef(false)
  if (!object) return null

  const commit = () => {
    const name = (draft ?? object.name).trim()
    if (!cancelled.current && name && name !== object.name) renameObject(object.id, name)
    cancelled.current = false
    setDraft(null)
  }

  return (
    <div data-board-title className={`absolute start-3 top-3 flex items-center gap-1 py-1 ps-3 pe-1 ${FLOAT} ${shift}`}>
      <input
        value={draft ?? object.name}
        aria-label="Map name"
        size={Math.min(Math.max((draft ?? object.name).length, 8), 28)}
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
      <TreeMenu
        label={`More: ${object.name}`}
        groups={actions.menuOf(object, {
          panel: { type: 'map', id: object.id },
          onRename: () => document.querySelector<HTMLInputElement>('[data-board-title] input')?.select(),
          element: () => document.querySelector('[data-board-title]'),
        })}
      />
      {actions.dialogs}
    </div>
  )
}
