import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { LuChevronLeft, LuChevronRight, LuExternalLink, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import { mapName, reorderMaps, useMaps } from '../../maps/maps'
import { useWorkspace } from '../../workspace/useWorkspace'
import { getBoard } from '../boardStore'
import { siblingMaps } from '../branches'
import { thumbnailOf } from '../snapshot'
import BoardCanvas from './BoardCanvas'
import { PRESENTER_STYLES, setPresenterStyle, usePresenterStyle, type PresenterStyle } from './presenterStyle'
import { moveItem } from './reorder'

const MOTION = 'duration-500 ease-in-out motion-reduce:transition-none'

/** How a page sits for the style, given where it is relative to the shown one (-1 before, 0 shown, 1 after) */
function pageStyle(style: PresenterStyle, index: number, current: number, count: number): { className: string; style: CSSProperties } {
  const rel = index - current
  if (style === 'fade') return { className: `absolute inset-0 transition-opacity ${MOTION} ${rel === 0 ? 'opacity-100' : 'pointer-events-none opacity-0'}`, style: {} }
  if (style === 'book') {
    // Turned pages lie flipped over their left edge; the pages still to come wait underneath, the earliest on top
    return {
      className: `absolute inset-0 origin-left transition-transform ${MOTION} [backface-visibility:hidden]`,
      style: { transform: rel < 0 ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: rel < 0 ? index : count - index, pointerEvents: rel === 0 ? 'auto' : 'none' },
    }
  }
  return { className: 'absolute inset-0 transition-transform ' + MOTION, style: { transform: `translateX(${rel * 100}%)` } }
}

/**
 * The maps, one after the other: the shown map on the stage (read only; a pin opens its card) and below it a strip of
 * thumbnails to drag into another order (the maps' order follows). Arrows, the strip and the keys change the map.
 */
export default function Presenter({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const workspace = useWorkspace()
  const style = usePresenterStyle()
  // With string ids (the boards' keys and the panels') and their names
  const maps = siblingMaps(useMaps(), mapId).map((m) => ({ ...m, id: String(m.id), name: mapName(m) }))
  const [currentId, setCurrentId] = useState(mapId)
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  const root = useRef<HTMLDivElement>(null)

  const current = Math.max(0, maps.findIndex((m) => m.id === currentId))
  const go = (i: number) => maps[i] && setCurrentId(maps[i].id)

  const reorder = (from: number, to: number) => {
    const ids = moveItem(maps.map((m) => m.id), from, to)
    if (ids.every((id, i) => id === maps[i].id)) return
    void reorderMaps(ids)
    setAnnounce(`${maps[from].name} moved to place ${to + 1}`)
  }
  const open = () => {
    onClose()
    if (maps[current].id !== mapId) workspace.replace({ type: 'map', id: mapId }, { type: 'map', id: maps[current].id })
  }

  useEffect(() => root.current?.focus(), [])

  return (
    <div
      ref={root}
      role="dialog"
      aria-label="Maps"
      tabIndex={-1}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') onClose()
        else if (e.key === 'ArrowLeft') go(current - 1)
        else if (e.key === 'ArrowRight') go(current + 1)
        else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) open()
      }}
      className="absolute inset-0 z-30 flex flex-col gap-3 bg-surface p-3 outline-none"
    >
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-heading">{maps[current]?.name}</h2>
        <div role="group" aria-label="Style" className="flex rounded-(--btn-radius) bg-fill p-0.5">
          {PRESENTER_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={style === s.id}
              onClick={() => setPresenterStyle(s.id)}
              className={`cursor-pointer rounded-(--corner-sm) px-3 py-1 text-small ${style === s.id ? 'bg-surface shadow-sm' : 'text-fg-muted hover:text-fg'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" icon={LuExternalLink} onClick={open}>
          Open
        </Button>
        <IconButton icon={LuX} label="Close" onClick={onClose} />
      </div>

      <div className="relative min-h-0 flex-1">
        <div className={`absolute inset-0 overflow-hidden rounded-(--card-radius) border border-line bg-fill ${style === 'book' ? '[perspective:1800px]' : ''}`}>
          {maps.map((m, i) => {
            const near = Math.abs(i - current) <= 1
            const p = pageStyle(style, i, current, maps.length)
            return (
              <div key={m.id} aria-hidden={i !== current} className={`${p.className} bg-surface`} style={p.style}>
                {near && <BoardCanvas mapId={m.id} board={getBoard(m.id)} interactive={i === current} />}
              </div>
            )
          })}
        </div>
        {current > 0 && (
          <IconButton icon={LuChevronLeft} label="Previous map" variant="secondary" onClick={() => go(current - 1)} className="absolute start-2 top-1/2 z-40 -translate-y-1/2" />
        )}
        {current < maps.length - 1 && (
          <IconButton icon={LuChevronRight} label="Next map" variant="secondary" onClick={() => go(current + 1)} className="absolute end-2 top-1/2 z-40 -translate-y-1/2" />
        )}
      </div>

      <ul aria-label="Maps (drag to reorder)" className="flex shrink-0 gap-2 overflow-x-auto pb-1">
        {maps.map((m, i) => {
          const picture = thumbnailOf(getBoard(m.id))
          return (
            <li
              key={m.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                setDragging(i)
              }}
              onDragOver={(e) => {
                if (dragging === null) return
                e.preventDefault()
                setOver(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging !== null) reorder(dragging, i)
                setDragging(null)
                setOver(null)
              }}
              onDragEnd={() => {
                setDragging(null)
                setOver(null)
              }}
              className={`w-36 shrink-0 ${over === i && dragging !== i ? 'rounded-(--card-radius) outline-2 outline-accent' : ''} ${dragging === i ? 'opacity-40' : ''}`}
            >
              <button
                type="button"
                aria-current={i === current}
                onClick={() => go(i)}
                onKeyDown={(e) => {
                  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault()
                    e.stopPropagation()
                    reorder(i, i + (e.key === 'ArrowLeft' ? -1 : 1))
                  }
                }}
                className={`flex w-full cursor-grab flex-col gap-1 rounded-(--card-radius) border p-1 text-start ${i === current ? 'border-accent bg-fill' : 'border-line hover-fill'}`}
              >
                <span className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-(--corner-sm) bg-white">
                  {picture ? <img src={picture} alt="" draggable={false} className="size-full object-contain" /> : <span className="text-small text-fg-subtle">Empty</span>}
                </span>
                <span className="truncate px-1 text-small">{m.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p role="status" className="sr-only">
        {announce}
      </p>
    </div>
  )
}
