import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { LuCamera, LuGitBranch, LuLayers, LuPencil, LuSearch, LuX } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import { mapName, renameMap, useMaps } from '../maps/maps'
import { useWorkspace } from '../workspace/useWorkspace'
import { getBoard } from './boardStore'
import BranchesPopout from './BranchesPopout'
import { FLOAT, ROUNDER, usePeekShift } from './floating'
import LayersPanel from './LayersPanel'
import MapPicker from './MapPicker'
import MapSearchPanel from './search/MapSearchPanel'
import { snapshotBlob } from './snapshot'
import { useCurrentBranch } from './useCurrentBranch'

/** What the left panel shows under the title bar, as tall as the editor: the search, or the layers; null: the bar alone */
export type LeftPanel = 'search' | 'layers' | null

/** How long the screenshot's error stays (ms) */
const ERROR_MS = 6000

/** A picture of the map's content, downloaded as `<name>.png` */
async function downloadScreenshot(mapId: string, name: string) {
  const blob = await snapshotBlob(getBoard(mapId))
  if (!blob) throw new Error('The browser could not make the picture')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name || 'map'}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type Props = {
  mapId: string
  editorWidth?: number
  panel: LeftPanel
  onPanel: (panel: LeftPanel) => void
  /** Selects an object (the layers' rows, a result's Edit) */
  onPickObject: (id: number) => void
  /** Moves the map to an object (a result opened) */
  onShowObject: (id: number) => void
}

/**
 * Top left: the search button, the map's name (a click lists the maps, MapPicker) and a ⋯ with everything that changes the map: Rename
 * (the name becomes an input: Enter or leaving it renames, Esc undoes), Branches, Layers, Screenshot. Search and Layers make the floating
 * bar the top of a panel as tall as the editor (`panel`)
 */
export default function MapTitleBar({ mapId, editorWidth, panel, onPanel, onPickObject, onShowObject }: Props) {
  const shift = usePeekShift()
  // Never reaches the tool panel: it is right-aligned (25rem wide with its gaps) or centred (half of it, 13.5rem, plus the gaps).
  // Measured on the whole editor, sidebar included (`--editor-w`), not on the board's area: that one changes while a sidebar opens, and the bar must not
  const fit = useWorkspace().isPane({ type: 'map', id: mapId })
    ? 'max-w-[calc(var(--editor-w,100%)-25rem)] @5xl:max-w-[calc(var(--editor-w,100%)/2-13.5rem)]'
    : 'max-w-[calc(var(--editor-w,100%)-25rem)] xl:max-w-[calc(var(--editor-w,100%)/2-13.5rem)]'
  const maps = useMaps()
  const object = maps.find((m) => String(m.id) === mapId)
  // The big name is the map's own (the first map of its branch group), whichever branch is open; the branch has its own item
  const title = maps.find((m) => object?.branchOf && m.id === object.branchOf) ?? object
  const branch = useCurrentBranch(mapId)
  const [branches, setBranches] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The text while it is being edited; null: not renaming
  const [draft, setDraft] = useState<string | null>(null)
  // Esc: leaving the field must not save what was typed
  const cancelled = useRef(false)
  useEffect(() => {
    if (!error) return
    const id = window.setTimeout(() => setError(null), ERROR_MS)
    return () => window.clearTimeout(id)
  }, [error])
  if (!object || !title) return null

  const commit = () => {
    const name = (draft ?? '').trim()
    if (!cancelled.current && name && name !== title.title) void renameMap(title.id, name)
    cancelled.current = false
    setDraft(null)
  }
  const shoot = async () => {
    setBusy(true)
    setError(null)
    try {
      await downloadScreenshot(mapId, mapName(object))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The picture could not be made')
    } finally {
      setBusy(false)
    }
  }
  const toggle = (next: Exclude<LeftPanel, null>) => onPanel(panel === next ? null : next)

  return (
    <div
      data-board-title
      style={editorWidth ? ({ '--editor-w': `${editorWidth}px` } as CSSProperties) : undefined}
      // Open, a column as tall as the editor; its own background is none: the pieces in it float, the map shows between them
      // (the panel under the bar may be wider than the bar: the tool panel is beside the bar only, never beside the panel). It stops above
      // the zoom control (bottom left)
      className={`pointer-events-none absolute start-3 top-3 flex flex-col gap-2 ${panel ? 'bottom-16 w-96 max-w-[calc(100%-1.5rem)]' : fit} ${shift}`}
    >
      <div className={`pointer-events-auto relative flex h-12.5 shrink-0 items-center gap-0.5 self-start ps-1.5 pe-1.5 ${fit} ${FLOAT} ${ROUNDER}`}>
        <IconButton
          icon={panel === 'search' ? LuX : LuSearch}
          label={panel === 'search' ? 'Close the search' : 'Search this map'}
          aria-expanded={panel === 'search'}
          onClick={() => toggle('search')}
        />
        {draft === null ? (
          <div className="min-w-0 flex-1">
            <MapPicker mapId={mapId} name={mapName(title)} />
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
            className="min-w-0 flex-1 rounded-(--btn-close-radius) bg-transparent px-2 text-heading outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
        )}
        <TreeMenu
          label={`More: ${mapName(title)}`}
          groups={[
            [{ label: 'Rename', icon: LuPencil, onClick: () => setDraft(title.title) }],
            [
              { label: branch.count > 1 ? `Branches · ${branch.current}` : 'Create branch', icon: LuGitBranch, onClick: () => setBranches(true) },
              { label: panel === 'layers' ? 'Hide layers' : 'Layers', icon: LuLayers, onClick: () => toggle('layers') },
            ],
            [{ label: busy ? 'Taking the screenshot…' : 'Screenshot', icon: LuCamera, onClick: () => void (busy || shoot()) }],
          ]}
        />
        <BranchesPopout mapId={mapId} open={branches} onOpenChange={setBranches} />
      </div>
      {error && (
        <p role="alert" className={`pointer-events-auto px-3 py-2 text-small text-danger ${FLOAT}`}>
          {error}
        </p>
      )}
      {panel === 'search' && (
        <MapSearchPanel
          mapId={mapId}
          onShow={onShowObject}
          onEdit={onPickObject}
          onClose={() => onPanel(null)}
        />
      )}
      {panel === 'layers' && <LayersPanel mapId={mapId} onPick={onPickObject} onClose={() => onPanel(null)} />}
    </div>
  )
}
