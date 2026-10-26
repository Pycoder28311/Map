import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LuChevronsDown, LuChevronsUp, LuLayoutTemplate, LuPlus, LuSave, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconSlot from '../../components/ui/icons/IconSlot'
import { SIDEBAR_ROW } from '../../components/ui/rowStyles'
import Divider from '../../components/ui/Divider'
import Callout from '../../components/ui/overlays/Callout'
import Modal from '../../components/ui/overlays/Modal'
import { SectionNote } from '../../components/layout/sidebar/ResourceRows'
import ResourceErrorDialog from '../../components/ui/resource/ResourceErrorDialog'
import {
  deleteLayout,
  dropChanges,
  fromSaved,
  keepChanges,
  sameLayout,
  saveLayout,
  selectLayout,
  toSaved,
  updateLayout,
  useLayoutsState,
  type SavedLayout,
} from './layoutsStore'
import { listKey } from '../../lib/resource/listStore'
import { useListStore } from '../../lib/resource/listStoreContext'
import { resourceByPanelType, resourcesWith } from '../../resources/registry'
import { parsePanelKey, workspaceHref, type WorkspaceLayout } from '../workspace/layout'
import { usePanelRegistry } from '../workspace/registryContext'
import { setSplit, useSplit } from '../workspace/split'
import type { PanelRef } from '../workspace/types'
import { useWorkspace } from '../workspace/useWorkspace'
import LayoutThumb, { TileAction } from './LayoutThumb'
import { positions, visibleCount } from './tileGrid'

/** Between tiles (px) */
const GAP = 6

// Full class strings so Tailwind can detect them at build time.
// Compact: the button narrows to a rail row (its icon's box + the row padding), like the tree's rows
const BUTTON_COMPACT = 'max-w-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'
// A tile slides between its grid place and its rail place with the sidebar
const TILE = 'absolute transition-[left,top,width,height] duration-(--sidebar-duration) ease-out motion-reduce:transition-none'

/** The id of the unsaved tile (the panes on screen) */
const UNSAVED = 'unsaved'

type Hint = { kind: 'drag' | 'swap' | 'empty'; key?: string }

const HINTS: Record<Hint['kind'], string> = {
  drag: 'Drag an object from the sidebar onto the panes to add it.',
  swap: 'Drag a pane by its grip onto the other one to swap them.',
  empty: 'Create a map or an object card first: use the + next to Objects.',
}

const cssPx = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0

/** A panel still exists: its type is registered and, if it's an item, its id is a resource's (a number; whether it is still there shows in the panel) */
function useExists() {
  const registry = usePanelRegistry()
  return {
    isKnown: (type: string) => type in registry,
    exists: (panel: PanelRef) => panel.type in registry && (!panel.id || (resourceByPanelType(panel.type) !== undefined && /^\d+$/.test(panel.id))),
    title: (panel: PanelRef) => registry[panel.type]?.title(panel.id) ?? 'Missing',
  }
}

/**
 * The sidebar's Layouts section: the layouts as 16:9 tiles filling the width (at most 2 per row,
 * bigger rows first), the first rows only until "Show more". In the rail the tiles stack in one column
 * of the same total height, so nothing below moves.
 * - the newest layouts first; panes on screen with no layout selected: an unsaved (blue) tile before
 *   them, with Save and ✕ (hides it until the panes change)
 * - hover a tile: Delete (asks first); the open layout, once changed, turns blue: Save (updates it),
 *   and a Create layout button below the tiles (saves the panes as a new layout, which becomes the
 *   selected one)
 * - leaving the panes for a single page: the layout is unselected and its changes dropped; switching
 *   straight to another layout's tile keeps them (the tile stays blue with Save and ✕)
 * - Create (no tiles): opens two random items as panes and shows a hint next to the sidebar
 */
export default function LayoutsSection({ compact }: { compact: boolean }) {
  const { layouts, status, refresh, selectedId, pending } = useLayoutsState()
  const saved = layouts
  const store = useListStore()
  const { isKnown, exists, title } = useExists()
  const workspace = useWorkspace()
  const [split] = useSplit()
  // Panes on screen: the workspace with 2 or more panels
  const active = workspace.onWorkspace && workspace.count >= 2 && workspace.layout !== null
  const selected = saved.find((l) => l.id === selectedId)

  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState<SavedLayout | null>(null)
  const [hint, setHint] = useState<Hint | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Runs a change of the layouts (a request); a refusal opens the error dialog */
  const attempt = (what: string, run: () => Promise<unknown>) =>
    void run().catch((e) => setError(`Could not ${what}: ${e instanceof Error ? e.message : 'unknown error'}`))
  // The panes (their URL) whose unsaved tile was closed with ✕: hidden until they change
  const [dismissed, setDismissed] = useState<string | null>(null)
  // The section's element: the hints point at it
  const [section, setSection] = useState<HTMLElement | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const railWidth = useMemo(() => 2 * cssPx('--btn-px') + cssPx('--btn-icon-size') + 2 * cssPx('--btn-close-p'), [])

  // The tiles' area is always the sidebar's full inner width (the rail only clips it)
  // Any tile at all (a saved one, or the unsaved panes)
  const hasTiles = saved.length > 0 || (active && !selected)
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    setWidth(box.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box)
    return () => observer.disconnect()
  }, [hasTiles])

  // The open layout, changed since it was saved (panels or sizes)
  const changedNow = active && selected !== undefined && !sameLayout(selected, workspace.layout!, split)

  // A selected layout stops being selected when the panes go away (a single page opened): its unsaved
  // changes are dropped with it, and an unsaved draft tile goes too (it only shows with panes). Only
  // on that change: opening a tile selects it before the navigation (a transition) has shown its panes
  const wasActive = useRef(active)
  useEffect(() => {
    if (wasActive.current && !active) selectLayout(null)
    wasActive.current = active
  }, [active])

  // A hint goes away once the user did what it says (the panes changed after it was shown)
  const currentKey = workspace.layout ? workspaceHref(workspace.layout) : ''
  const seen = useRef(false)
  useEffect(() => {
    if (!hint?.key) return
    if (currentKey === hint.key) seen.current = true
    else if (seen.current) setHint(null)
  }, [currentKey, hint])

  /** Opens a layout: with its unsaved changes if it has some (they're then on screen, so not kept) */
  const open = (layout: SavedLayout) => {
    const held = pending[layout.id]
    const next = held ? held.layout : fromSaved(layout, isKnown, exists)
    if (!next) return
    // Switching straight from another changed layout: keep its changes (its tile stays blue: Save / ✕)
    if (changed && selected && selected.id !== layout.id) keepChanges(selected.id, workspace.layout!, split)
    setSplit(held ? held.split : layout.split)
    workspace.openLayout(next)
    selectLayout(layout.id)
    if (held) dropChanges(layout.id)
  }

  /** Opens 2 random items as panes; `save`: also saves them as a new layout (selected, its tile appears) */
  function createRandom(save = false) {
    // The items the lists have loaded (no request of its own), of every resource that opens as a panel
    const candidates: PanelRef[] = resourcesWith('panel').flatMap((r) =>
      store.snapshot(listKey(r.name, { archived: false })).items.map((item) => ({ type: r.panelType, id: String((item as { id: number }).id) })),
    )
    if (candidates.length < 2) return setHint({ kind: 'empty' })
    const shuffled = [...candidates].sort(() => Math.random() - 0.5)
    const layout: WorkspaceLayout = { template: '2-cols', panels: shuffled.slice(0, 2) }
    seen.current = false
    setHint({ kind: candidates.length >= 3 ? 'drag' : 'swap', key: workspaceHref(layout) })
    if (save) {
      // Even halves, so the new tile matches what opens (nothing to save yet)
      const even = { x: 0.5, y: 0.5 }
      setSplit(even)
      attempt('save the layout', () => saveLayout(layout, even))
    }
    workspace.openLayout(layout)
  }

  // The panes on screen, not saved yet (no layout selected): first, in blue (unless closed with ✕)
  const draft = active && !selected && currentKey !== dismissed ? workspace.layout! : null
  // The open layout, changed since it was saved (panels or sizes): its tile offers Save
  const changed = changedNow

  // The divider's +: a new saved layout (the first Create button only opens panes: createRandom())
  const create = { icon: LuPlus, label: 'New layout', onClick: () => createRandom(true) }

  const namesOf = (layout: Pick<SavedLayout, 'panels'>) =>
    layout.panels.map((key) => {
      const panel = parsePanelKey(key)
      return panel && exists(panel) ? title(panel) : 'Missing'
    })
  const missingIn = (layout: SavedLayout) => layout.panels.some((key) => !exists(parsePanelKey(key) ?? { type: '' }))

  // Every tile, the unsaved one first
  const tilesData = [
    ...(draft
      ? [
          {
            layout: { id: UNSAVED, template: draft.template, split },
            names: draft.panels.map(title),
            unsaved: true as const,
          },
        ]
      : []),
    // Newest first (the server's order); one with changes kept from before shows them (blue, until saved or dropped)
    ...saved.map((layout) => {
      const held = pending[layout.id]
      const shape = held ? { ...layout, ...toSaved(held.layout, held.split) } : layout
      return { layout: shape, names: namesOf(shape), unsaved: false as const }
    }),
  ]
  const n = tilesData.length
  const shown = visibleCount(n, expanded)
  const { tiles, height } = positions(n, shown, { width, gap: GAP, railWidth, mode: compact ? 'rail' : 'grid' })
  const hidden = n - visibleCount(n, false)

  const actionsOf = (layout: SavedLayout) => {
    const held = pending[layout.id]
    return (
      <>
        {layout.id === selectedId && changed && (
          <TileAction icon={LuSave} label="Save changes" tone="highlight" onClick={() => attempt('save the layout', () => updateLayout(layout.id, workspace.layout!, split))} />
        )}
        {/* Changes kept after its panes were left: save them, or drop them (✕) */}
        {held && (
          <>
            <TileAction icon={LuSave} label="Save changes" tone="highlight" onClick={() => attempt('save the layout', () => updateLayout(layout.id, held.layout, held.split))} />
            <TileAction icon={LuX} label="Discard changes" onClick={() => dropChanges(layout.id)} />
          </>
        )}
        <TileAction icon={LuTrash2} label="Delete layout" tone="danger" onClick={() => setDeleting(layout)} />
      </>
    )
  }

  return (
    <section ref={setSection} aria-label="Layouts">
      {/* + at the right edge: a new layout, like the first Create button (that one shows while there are no tiles) */}
      <Divider label="Layouts" action={n > 0 ? create : undefined} compact={compact} className="my-(--divider-gap)" />

      {n === 0 && status !== 'ready' ? (
        // The layouts are on their way (or could not be read)
        status === 'error' ? (
          <Button variant="text" onClick={refresh} className="self-start">
            <SectionNote compact={compact}>Could not load. Try again</SectionNote>
          </Button>
        ) : (
          <SectionNote compact={compact}>Loading…</SectionNote>
        )
      ) : n === 0 ? (
        // No layouts and no panes: opens two random items as panes
        <CreateButton compact={compact} onClick={() => createRandom()} />
      ) : (
        <>
          <div ref={boxRef} className="relative transition-[height] duration-(--sidebar-duration)" style={{ height }}>
            {tilesData.slice(0, shown).map(({ layout, names, unsaved }, i) =>
              unsaved ? (
                <LayoutThumb
                  key={UNSAVED}
                  layout={layout}
                  names={names}
                  variant="unsaved"
                  labels={!compact}
                  actions={
                    !compact && (
                      <>
                        <TileAction icon={LuSave} label="Save layout" tone="highlight" onClick={() => attempt('save the layout', () => saveLayout(draft!, split))} />
                        <TileAction icon={LuX} label="Close" onClick={() => setDismissed(currentKey)} />
                      </>
                    )
                  }
                  style={tiles[i]}
                  className={TILE}
                />
              ) : (
                <LayoutThumb
                  key={layout.id}
                  layout={layout}
                  names={names}
                  selected={layout.id === selectedId}
                  // Changed since saved (open now, or changes kept from before): blue like the unsaved tile
                  variant={(layout.id === selectedId && changed) || layout.id in pending ? 'unsaved' : 'saved'}
                  missing={missingIn(layout as SavedLayout)}
                  onOpen={() => open(layout as SavedLayout)}
                  draggable
                  labels={!compact}
                  actions={!compact && actionsOf(layout as SavedLayout)}
                  style={tiles[i]}
                  className={TILE}
                />
              ),
            )}
          </div>
          {/* The open layout changed: save the panes as a new layout instead (it becomes the selected one) */}
          {changed && <CreateButton compact={compact} onClick={() => attempt('save the layout', () => saveLayout(workspace.layout!, split))} className="mt-2" />}
          {hidden > 0 && (
            // A sidebar row (not a button)
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              title={expanded ? 'Show less' : `Show ${hidden} more`}
              // Closed sidebar: only its icon (the row narrows to a rail row, and has no text at all)
              aria-label={expanded ? 'Show less' : `Show ${hidden} more`}
              className={`${SIDEBAR_ROW} mt-1 w-full justify-start overflow-hidden text-fg-muted transition-[max-width] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ${compact ? BUTTON_COMPACT : 'max-w-full'}`}
            >
              <IconSlot icon={expanded ? LuChevronsUp : LuChevronsDown} />
              {/* Not drawn while the sidebar is closed (the sidebar clips it while it opens) */}
              {!compact && <span className="whitespace-nowrap">{expanded ? 'Show less' : `Show more (${hidden})`}</span>}
            </button>
          )}
        </>
      )}

      {hint && (
        <Callout anchor={section} beside={document.getElementById('sidebar')} onClose={() => setHint(null)}>
          {HINTS[hint.kind]}
        </Callout>
      )}

      {error && <ResourceErrorDialog message={error} onClose={() => setError(null)} />}

      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title="Delete layout"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                onClick={() => {
                  attempt('delete the layout', () => deleteLayout(deleting.id))
                  setDeleting(null)
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-body">Delete this layout ({namesOf(deleting).join(', ')})? This can't be undone.</p>
        </Modal>
      )}
    </section>
  )
}

/** The full-width Create layout button (in the rail, only its icon) */
function CreateButton({ compact, onClick, className = '' }: { compact: boolean; onClick: () => void; className?: string }) {
  return (
    <Button
      variant="secondary"
      icon={LuLayoutTemplate}
      onClick={onClick}
      title="Create layout"
      className={`w-full justify-start overflow-hidden whitespace-nowrap transition-[max-width] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ${compact ? BUTTON_COMPACT : 'max-w-full'} ${className}`}
    >
      <span
        className={`overflow-hidden transition-[max-width,opacity] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ${compact ? 'max-w-0 opacity-0' : 'max-w-40'}`}
      >
        Create layout
      </span>
    </Button>
  )
}
