import { useLayoutEffect, useRef, type RefObject } from 'react'
import { LuRedo2, LuUndo2 } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { redo, undo, useCanRedo, useCanUndo } from './boardStore'
import { useWorkspace } from '../workspace/useWorkspace'
import { useFocusMode } from '../focus/FocusMode'
import { FLOAT, ROUNDER } from './floating'
import { TOOLS, type Tool, type ToolId } from './tools'

type Props = {
  mapId: string
  tool: ToolId
  onTool: (tool: ToolId) => void
  /** The board's area (the editor without its right sidebar): the panel never goes over its right edge, and stops at the title row's end */
  area: RefObject<HTMLElement | null>
}

/** The room kept between the panel and the title row, and between the panel and the area's right edge (px) */
const GAP = 8
const EDGE = 12

/**
 * Keeps the panel centred (on the page, or on its pane) while it fits, and moves it left as the area narrows so it is not over the right
 * sidebar, until it touches the title row (MapTitleBar's `data-title-row`): there it stops. Placed in pixels, measured again whenever
 * the area, the title row, the panel or the window changes size, and every frame while the app's sidebar slides the title row along
 */
function useKeepClear(panel: RefObject<HTMLDivElement | null>, area: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = panel.current
    const box = area.current
    if (!el || !box) return
    const place = () => {
      const parent = el.offsetParent as HTMLElement | null
      const pr = parent?.getBoundingClientRect()
      const origin = pr?.left ?? 0
      const centre = pr ? pr.left + pr.width / 2 : window.innerWidth / 2
      const title = box.querySelector('[data-title-row]')?.getBoundingClientRect()
      const min = title ? title.right + GAP : -Infinity
      const max = box.getBoundingClientRect().right - el.offsetWidth - EDGE
      // Centred, unless that is over the right sidebar; never over the title row
      el.style.left = `${Math.max(min, Math.min(centre - el.offsetWidth / 2, max)) - origin}px`
    }
    place()
    const watcher = new ResizeObserver(place)
    for (const watched of [el, box, el.offsetParent, box.querySelector('[data-title-row]')]) if (watched) watcher.observe(watched)
    window.addEventListener('resize', place)
    // The app's sidebar slides the top left pieces to the right (a transform: no resize to observe): while that slides, the panel is placed
    // again every frame, so it is pushed along and never touched
    const title = box.querySelector('[data-board-title]')
    let frame = 0
    let sliding = 0
    const follow = () => {
      place()
      if (sliding > 0) frame = requestAnimationFrame(follow)
    }
    const start = (e: Event) => {
      if (e.target !== title) return
      if (sliding++ === 0) frame = requestAnimationFrame(follow)
    }
    const end = (e: Event) => {
      if (e.target !== title || sliding === 0) return
      if (--sliding === 0) {
        cancelAnimationFrame(frame)
        place()
      }
    }
    title?.addEventListener('transitionrun', start)
    title?.addEventListener('transitionend', end)
    title?.addEventListener('transitioncancel', end)
    return () => {
      watcher.disconnect()
      window.removeEventListener('resize', place)
      cancelAnimationFrame(frame)
      title?.removeEventListener('transitionrun', start)
      title?.removeEventListener('transitionend', end)
      title?.removeEventListener('transitioncancel', end)
    }
  })
}

// Bigger buttons than the rest of the editor's: the tools are what is used all the time
// Square, as tall as the bar (the same height as the title bar's: h-12.5), with more room inside the buttons and none between them
const BIG = 'relative h-full! aspect-square! rounded-(--tool-radius)! [&>svg]:size-6!'

/**
 * The tools, then undo and redo. On the page it is centred on the page like the navbar's Recent History above it (so it does not
 * move when the sidebar opens or closes); in a pane it is centred on the pane.
 */
export default function ToolPanel({ mapId, tool, onTool, area }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  useKeepClear(panel, area)
  const canUndo = useCanUndo(mapId)
  const canRedo = useCanRedo(mapId)
  const inPane = useWorkspace().isPane({ type: 'map', id: mapId })
  // Its left is set in pixels (useKeepClear). Below the navbar, or at the top like the title bar when the navbar is hidden (focus mode)
  const focus = useFocusMode().on
  const place = inPane ? 'absolute top-3' : `fixed ${focus ? 'top-3' : 'top-[calc(var(--sidebar-rail)+0.75rem)]'} z-10`
  const toolButton = (t: Tool) => (
    <IconButton
      key={t.id}
      icon={t.icon}
      label={t.enabled ? `${t.label} (${t.key.toUpperCase()})` : `${t.label}: ${t.soon}`}
      variant="ghost"
      // (a radio, not a pressed button: the chosen one is shown by the sliding box behind it, not by the button's own look)
      role="radio"
      aria-checked={t.id === tool}
      disabled={!t.enabled}
      className={BIG}
      onClick={() => onTool(t.id)}
    />
  )
  // The Text tool right after the Point tool
  const tools = [...TOOLS.filter((t) => t.id !== 'text' && t.id !== 'point'), ...TOOLS.filter((t) => t.id === 'point'), ...TOOLS.filter((t) => t.id === 'text')]
  const chosen = tools.findIndex((t) => t.id === tool)
  return (
    <div ref={panel} role="toolbar" aria-label="Tools" aria-orientation="horizontal" className={`${place} flex h-12.5 items-center ${FLOAT} ${ROUNDER}`}>
      <div role="radiogroup" aria-label="Tool" className="relative flex h-full items-center">
        {/* The chosen tool's background and thick line: one box that slides to the tool clicked, behind the buttons */}
        {chosen >= 0 && (
          <span
            aria-hidden
            style={{ transform: `translateX(${chosen * 100}%)` }}
            className="pointer-events-none absolute inset-y-0 start-0 aspect-square border-b-[3px] border-[var(--color-bone)] bg-fill transition-transform duration-200 ease-out motion-reduce:transition-none"
          />
        )}
        {tools.map(toolButton)}
      </div>
      <span aria-hidden className="mx-0.5 h-8 w-px bg-line" />
      <IconButton icon={LuUndo2} label="Undo (Ctrl+Z)" className={BIG} disabled={!canUndo} onClick={() => undo(mapId)} />
      <IconButton icon={LuRedo2} label="Redo (Ctrl+Shift+Z)" className={BIG} disabled={!canRedo} onClick={() => redo(mapId)} />
    </div>
  )
}
