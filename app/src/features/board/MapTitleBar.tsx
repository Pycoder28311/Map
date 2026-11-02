import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { LuCamera, LuGitBranch, LuLayers, LuPencil, LuSearch, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import { mapName, renameMap, useMaps } from '../maps/maps'
import { useWorkspace } from '../workspace/useWorkspace'
import { getBoard } from './boardStore'
import BranchesPopout from './BranchesPopout'
import { FLOAT, ROUNDER, usePeekShift } from './floating'
import LayersPanel from './LayersPanel'
import MapNotesPanel from './MapNotesPanel'
import MapPicker, { MapsPanel } from './MapPicker'
import MapSearchPanel from './search/MapSearchPanel'
import { snapshotBlob } from './snapshot'
import { useCurrentBranch } from './useCurrentBranch'
import type { MapSave } from './useMapSave'

/** What the left panel shows under the title bar, as tall as the editor: the search, the notes or the layers; null: the bar alone */
export type LeftPanel = 'search' | 'layers' | 'notes' | 'maps' | null

/** Each small floating piece of the top left: the floating look with square corners (floating.ts), as tall as the row */
const PIECE = `${FLOAT} ${ROUNDER}`

/** The words of Save and Notes: as big as the map's name (text-heading) */
const TITLE_TEXT = '[--btn-font-size:1.125rem]'

/** How long a closing panel takes to slide up (ms): animations.css, --animate-panel-out */
const CLOSE_MS = 200

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
  /** The map's Save (none for a visitor): shown while there are changes not saved */
  save?: MapSave
  /** A point's form (PointForm), or the article of the selected object (ObjectArticleForm): it takes the column under the bar, in place of the search, notes or layers */
  form?: ReactNode
  editorWidth?: number
  panel: LeftPanel
  onPanel: (panel: LeftPanel) => void
  /** Selects an object (the layers' rows, a result's Edit) */
  onPickObject: (id: number) => void
  /** Moves the map to an object (a result opened) */
  onShowObject: (id: number) => void
}

/**
 * Top left: the map's name (a click lists the maps, MapPicker; a dot beside it while there are changes not saved), Save (while there
 * are any), the Notes button, the search button and a ⋯ with everything that changes the map: Rename
 * (the name becomes an input: Enter or leaving it renames, Esc undoes), Branches, Layers, Screenshot. Search, Notes and Layers make the floating
 * bar the top of a panel as tall as the editor (`panel`); a selected point's form or an object's article (`form`) takes that place while it is open
 */
export default function MapTitleBar({ mapId, save, form, editorWidth, panel, onPanel, onPickObject, onShowObject }: Props) {
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
  // A panel that is closed over an open form slides up before it goes: `shown` keeps it while that plays
  const [shown, setShown] = useState<LeftPanel>(panel)
  if (panel && panel !== shown) setShown(panel)
  // (it slides up only over an open form, to give the form its place back smoothly; alone it just goes)
  if (!panel && !form && shown !== null) setShown(null)
  const closing = !panel && shown !== null
  useEffect(() => {
    if (!closing) return
    const id = window.setTimeout(() => setShown(null), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [closing])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The text while it is being edited; null: not renaming
  const [draft, setDraft] = useState<string | null>(null)
  // Esc: leaving the field must not save what was typed
  const cancelled = useRef(false)
  // From the bar's start to the end of its fourth piece (the ⋯ button): the width of the panels and lists under it
  const row = useRef<HTMLDivElement>(null)
  const third = useRef<HTMLDivElement>(null)
  const [span, setSpan] = useState<number | null>(null)
  useEffect(() => {
    const from = row.current
    const to = third.current
    if (!from || !to) return
    const measure = () => setSpan(Math.round(to.getBoundingClientRect().right - from.getBoundingClientRect().left))
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(from)
    watcher.observe(to)
    for (const piece of Array.from(from.children)) watcher.observe(piece)
    return () => watcher.disconnect()
  }, [draft, save?.dirty, save?.saving, object?.title])
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
      style={{ ...(editorWidth ? { '--editor-w': `${editorWidth}px` } : {}), ...(span ? { '--bar-w': `${span}px` } : {}) } as CSSProperties}
      // Open, a column as tall as the editor; its own background is none: the pieces in it float, the map shows between them
      // (the panel under the bar may be wider than the bar: the tool panel is beside the bar only, never beside the panel). It stops above
      // the zoom control (bottom left)
      className={`pointer-events-none absolute start-3 top-3 flex flex-col gap-sm ${shown || form ? `bottom-16 max-w-[calc(100%-1.5rem)] ${span ? 'w-(--bar-w)' : 'w-96'}` : fit} ${shift}`}
    >
      {/* Not one bar: a small floating piece for each of them, the name, Notes, and the square search and ⋯ */}
      <div ref={row} data-title-row className={`pointer-events-none relative flex h-12.5 shrink-0 items-stretch gap-xs self-start ${fit}`}>
        <div className={`pointer-events-auto flex min-w-0 items-center ps-1.5 pe-1.5 ${PIECE}`}>
        {draft === null ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <MapPicker name={mapName(title)} open={panel === 'maps'} onToggle={() => toggle('maps')} />
            {save?.dirty && <span role="status" aria-label="Changes not saved" title="Changes not saved" className="size-2 shrink-0 rounded-full bg-accent" />}
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
        </div>
        <div className={`pointer-events-auto flex shrink-0 items-center px-1 ${PIECE}`}>
          <Button variant="ghost" plain noline className={TITLE_TEXT} aria-expanded={panel === 'notes'} aria-pressed={panel === 'notes'} onClick={() => toggle('notes')}>
            Notes
          </Button>
        </div>
        {/* Squares as tall as the pieces beside them */}
        <div className={`pointer-events-auto aspect-square shrink-0 p-1.5 ${PIECE}`}>
          <IconButton
            bigIcon
            noline
            className="size-full! [--btn-icon-size:1.25rem]!"
            icon={panel === 'search' ? LuX : LuSearch}
            label={panel === 'search' ? 'Close the search' : 'Search this map'}
            aria-expanded={panel === 'search'}
            aria-pressed={panel === 'search'}
            onClick={() => toggle('search')}
          />
        </div>
        <div ref={third} className={`pointer-events-auto relative aspect-square shrink-0 p-1.5 ${PIECE}`}>
        <TreeMenu
          fill
          under={() => third.current}
          plain
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
      </div>
      {(error || save?.error) && (
        <p role="alert" className={`pointer-events-auto px-3 py-2 text-small text-danger ${FLOAT}`}>
          {error ?? save?.error}
        </p>
      )}
      {/* Whatever opens under the bar pops in (a new panel, a new form: a new key, a new popup). A panel and a form are both shown: the
          panel on top (up to half of the column), the form under it */}
      {shown && (
        <div
          key="panel"
          inert={closing || undefined}
          className={`pointer-events-none origin-top-left motion-reduce:animate-none ${form ? `grid max-h-1/2 shrink-0 grid-rows-[1fr] ${closing ? 'animate-panel-out' : 'animate-panel-in'}` : `flex min-h-0 flex-1 flex-col ${closing ? 'animate-panel-up' : 'animate-dropdown-in'}`}`}
        >
          {/* (above a form: a row of the grid that can shrink to nothing while the panel opens) */}
          <div className="flex min-h-0 flex-1 flex-col">
            {shown === 'search' && <MapSearchPanel mapId={mapId} onShow={onShowObject} onEdit={onPickObject} onClose={() => onPanel(null)} />}
            {shown === 'maps' && <MapsPanel mapId={mapId} onClose={() => onPanel(null)} />}
            {shown === 'notes' && <MapNotesPanel mapId={mapId} onClose={() => onPanel(null)} />}
            {shown === 'layers' && <LayersPanel mapId={mapId} onPick={onPickObject} onClose={() => onPanel(null)} />}
          </div>
        </div>
      )}
      {form && (
        <div
          key="form"
          // (under a panel: the gap between them is --spacing-lg: the column's own plus this margin)
          className={`pointer-events-none flex min-h-0 flex-1 origin-top-left animate-dropdown-in flex-col motion-reduce:animate-none ${shown === 'maps' ? 'mt-3' : shown ? 'mt-2' : ''}`}
        >
          {form}
        </div>
      )}
    </div>
  )
}
