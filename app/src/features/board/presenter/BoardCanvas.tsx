import { useEffect, useRef, useState } from 'react'
import { useBackground } from '../background'
import { useFillImages } from '../fillTextures'
import { hitTest } from '../hit'
import PointCard from '../PointCard'
import PointView from '../PointView'
import { paintBoard } from '../render'
import type { Board } from '../types'
import { fitView, screenToBoard, type Size } from '../viewport'

const HIT_PX = 8

/** A board to look at, fitted to the box it is in. With `interactive`, a click on a pin opens its card (the visitor's view) */
export default function BoardCanvas({ mapId, board, paint = true, interactive = false, onShowBoardObject }: { mapId: string; board: Board; paint?: boolean; interactive?: boolean; onShowBoardObject?: (id: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<Size | null>(null)
  const [open, setOpen] = useState<{ id: number; full: boolean } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const background = useBackground(mapId)
  useFillImages()
  const view = size ? fitView(size) : null
  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx || !size || !view || !paint) return
    const dpr = window.devicePixelRatio || 1
    el.width = Math.round(size.w * dpr)
    el.height = Math.round(size.h * dpr)
    paintBoard(ctx, board, view, size, dpr, [], null, null, background)
  })

  const point = open ? board.objects.find((o) => o.id === open.id) : undefined
  return (
    <div ref={box} className="relative size-full">
      <canvas
        ref={canvas}
        aria-label="Map"
        className="absolute inset-0 size-full"
        onPointerDown={(e) => {
          if (!interactive || !view) return
          const rect = e.currentTarget.getBoundingClientRect()
          const hit = hitTest(board, screenToBoard(view, { x: e.clientX - rect.left, y: e.clientY - rect.top }), HIT_PX / view.scale)
          setOpen(hit?.kind === 'point' ? { id: hit.id, full: false } : null)
        }}
      />
      {interactive && view && size && point?.kind === 'point' &&
        (open!.full ? (
          <PointView point={point} board={board.objects} onClose={() => setOpen(null)} onShowBoardObject={(id) => { setOpen(null); onShowBoardObject?.(id) }} />
        ) : (
          <PointCard point={point} view={view} size={size} onMore={() => setOpen({ id: point.id, full: true })} />
        ))}
    </div>
  )
}
