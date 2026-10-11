import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LuChevronsDown, LuChevronsUp, LuLayoutTemplate, LuPlus, LuSave } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import Divider from '../../components/ui/Divider'
import Callout from '../../components/ui/overlays/Callout'
import Modal from '../../components/ui/overlays/Modal'
import {
  fromSaved,
  sameLayout,
  saveLayout,
  selectLayout,
  updateLayout,
  useLayoutsState,
  type SavedLayout,
} from '../../mocks/layoutsStore'
import { findObject } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import { parsePanelKey, workspaceHref, type WorkspaceLayout } from '../workspace/layout'
import { usePanelRegistry } from '../workspace/registryContext'
import { setSplit, useSplit } from '../workspace/split'
import type { PanelRef } from '../workspace/types'
import { useWorkspace } from '../workspace/useWorkspace'
import LayoutThumb from './LayoutThumb'
import { positions, visibleCount } from './tileGrid'

/** Between tiles (px) */
const GAP = 6

// Full class strings so Tailwind can detect them at build time.
// Compact: the button narrows to a rail row (its icon's box + the row padding), like the tree's rows
const BUTTON_COMPACT = 'max-w-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'

type Hint = { kind: 'drag' | 'swap' | 'empty'; key?: string }

const HINTS: Record<Hint['kind'], string> = {
  drag: 'Drag an object from the sidebar onto the panes to add it.',
  swap: 'Drag a pane by its grip onto the other one to swap them.',
  empty: 'Create a project or a note first: use the + next to Projects or Notes.',
}

const cssPx = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0

/** A panel still exists: its type is registered and, if it's an object, the object is there (not archived) */
function useExists() {
  const registry = usePanelRegistry()
  return {
    isKnown: (type: string) => type in registry,
    exists: (panel: PanelRef) => panel.type in registry && (!panel.id || findObject(panel.id) !== undefined),
    title: (panel: PanelRef) => registry[panel.type]?.title(panel.id) ?? 'Missing',
  }
}

/**
 * The sidebar's Layouts section: Save / Create, then the saved layouts as 16:9 tiles filling the
 * width (bigger rows first), the first rows only until "Show more". In the rail the tiles stack in one
 * column of the same total height, so nothing below moves.
 * - Save (panes on screen): a new layout, or, with one selected (opened from its tile), asks to update it
 * - Create (no panes): opens two random objects as panes and shows a hint next to the sidebar
 */
export default function LayoutsSection({ compact }: { compact: boolean }) {
  const { layouts, selectedId } = useLayoutsState()
  const saved = layouts.filter((l) => !l.archived)
  const objects = useMockObjects() // names and missing panels follow renames / archives
  const { isKnown, exists, title } = useExists()
  const workspace = useWorkspace()
  const [split] = useSplit()
  // Panes on screen: the workspace with 2 or more panels
  const active = workspace.onWorkspace && workspace.count >= 2 && workspace.layout !== null
  const selected = saved.find((l) => l.id === selectedId)

  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [hint, setHint] = useState<Hint | null>(null)
  // The section's element: the hints point at it
  const [section, setSection] = useState<HTMLElement | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const railWidth = useMemo(() => 2 * cssPx('--btn-px') + cssPx('--btn-icon-size') + 2 * cssPx('--btn-close-p'), [])

  // The tiles' area is always the sidebar's full inner width (the rail only clips it)
  const hasLayouts = saved.length > 0
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    setWidth(box.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box)
    return () => observer.disconnect()
  }, [hasLayouts])

  // A selected layout stops being selected when the panes go away. Only on that change: opening a
  // tile selects it before the navigation (a transition) has shown its panes
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

  const open = (layout: SavedLayout) => {
    const next = fromSaved(layout, isKnown, exists)
    if (!next) return
    setSplit(layout.split)
    workspace.openLayout(next)
    selectLayout(layout.id)
  }

  const create = () => {
    // Every object that opens as a panel (a project opens its Overview)
    const candidates: PanelRef[] = objects
      .filter((o) => findObject(o.id))
      .map((o) => ({ type: o.kind, id: o.id }))
    if (candidates.length < 2) return setHint({ kind: 'empty' })
    const shuffled = [...candidates].sort(() => Math.random() - 0.5)
    const layout: WorkspaceLayout = { template: '2-cols', panels: shuffled.slice(0, 2) }
    seen.current = false
    setHint({ kind: candidates.length >= 3 ? 'drag' : 'swap', key: workspaceHref(layout) })
    workspace.openLayout(layout)
  }

  const save = () => {
    if (!active) return create()
    if (!selected) return void saveLayout(workspace.layout!, split)
    setConfirm(true)
  }

  // Nothing to save: the panes are exactly the selected layout
  const unchanged = active && selected !== undefined && sameLayout(selected, workspace.layout!, split)
  const action = {
    icon: active ? LuSave : LuPlus,
    label: active ? (selected ? 'Save layout (update or new)' : 'Save layout') : 'Create layout',
    onClick: save,
    disabled: unchanged,
  }

  const namesOf = (layout: Pick<SavedLayout, 'panels'>) =>
    layout.panels.map((key) => {
      const panel = parsePanelKey(key)
      return panel && exists(panel) ? title(panel) : 'Missing'
    })
  const missingIn = (layout: SavedLayout) => layout.panels.some((key) => !exists(parsePanelKey(key) ?? { type: '' }))

  const shown = visibleCount(saved.length, expanded)
  const { tiles, height } = positions(saved.length, shown, { width, gap: GAP, railWidth, mode: compact ? 'rail' : 'grid' })
  const hidden = saved.length - visibleCount(saved.length, false)

  return (
    <section ref={setSection} aria-label="Layouts">
      <Divider label="Layouts" action={saved.length > 0 ? action : undefined} compact={compact} className="my-(--divider-gap)" />

      {saved.length === 0 ? (
        // No layouts yet: one full-width button
        <Button
          variant="secondary"
          icon={LuLayoutTemplate}
          onClick={save}
          title={action.label}
          className={`w-full justify-start overflow-hidden whitespace-nowrap transition-[max-width] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ${compact ? BUTTON_COMPACT : 'max-w-full'}`}
        >
          {active ? 'Save layout' : 'Create layout'}
        </Button>
      ) : (
        <>
          <div ref={boxRef} className="relative transition-[height] duration-(--sidebar-duration)" style={{ height }}>
            {saved.slice(0, shown).map((layout, i) => (
              <LayoutThumb
                key={layout.id}
                layout={layout}
                names={namesOf(layout)}
                selected={layout.id === selectedId}
                missing={missingIn(layout)}
                onOpen={() => open(layout)}
                draggable
                labels={!compact}
                style={tiles[i]}
                className="absolute"
              />
            ))}
          </div>
          {hidden > 0 && (
            <Button
              variant="ghost"
              icon={expanded ? LuChevronsUp : LuChevronsDown}
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              title={expanded ? 'Show less' : `Show ${hidden} more`}
              className="mt-1 w-full justify-start text-fg-muted"
            >
              <span className="whitespace-nowrap">{expanded ? 'Show less' : `Show more (${hidden})`}</span>
            </Button>
          )}
        </>
      )}

      {hint && (
        <Callout anchor={section} beside={document.getElementById('sidebar')} onClose={() => setHint(null)}>
          {HINTS[hint.kind]}
        </Callout>
      )}

      {confirm && selected && active && (
        <Modal
          open
          onClose={() => setConfirm(false)}
          title="Update layout?"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  saveLayout(workspace.layout!, split)
                  setConfirm(false)
                }}
              >
                Save as new
              </Button>
              <Button
                onClick={() => {
                  updateLayout(selected.id, workspace.layout!, split)
                  setConfirm(false)
                }}
              >
                Update
              </Button>
            </>
          }
        >
          <p className="mb-3 text-body">Replace the selected layout with what's on screen now?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              // Own ids: the sidebar's tile keeps its drag id
              { caption: 'Saved', layout: { ...selected, id: `preview-${selected.id}` }, names: namesOf(selected) },
              {
                caption: 'Now',
                layout: { id: 'preview-now', template: workspace.layout!.template, split },
                names: workspace.layout!.panels.map(title),
              },
            ].map(({ caption, layout, names }) => (
              <figure key={caption} className="flex flex-col gap-1">
                <LayoutThumb layout={layout} names={names} labels={false} className="aspect-video w-full" />
                <figcaption className="text-small text-fg-muted">
                  {caption}: {names.join(', ')}
                </figcaption>
              </figure>
            ))}
          </div>
        </Modal>
      )}
    </section>
  )
}
