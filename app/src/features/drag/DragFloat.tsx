import { useDndMonitor } from '@dnd-kit/core'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buttonClass } from '../../components/ui/buttons/buttonStyles'
import { dragPoint } from '../../lib/dnd'
import type { PanelDragData } from '../workspace/types'
import { floatPosition, grabFraction } from './floatPosition'
import { objectOf } from './objectDrag'
import { surfaceAt, type DragLook, type DragLookItem } from './surfaces'

type Point = { x: number; y: number }

/**
 * The floating copy of a dragged object. The pointer stays exactly where the object was grabbed (as a
 * fraction of the copy's box, so it holds when the copy changes shape), and the copy takes the look
 * of the surface under the pointer (surfaces.ts): a sidebar row over the sidebar, a card row over the
 * Dashboard's list… Anywhere else, a small pill. Follows the pointer without re-rendering (its
 * transform is set directly); `data-drag-float`: what the fall-into effects copy on drop.
 */
export default function DragFloat() {
  const ref = useRef<HTMLDivElement>(null)
  const [item, setItem] = useState<DragLookItem | null>(null)
  // The surface under the pointer (its id, for the cross-fade; its look)
  const [surface, setSurface] = useState<{ id: string; look: DragLook } | null>(null)
  const grab = useRef({ fx: 0.5, fy: 0.5 })
  const pointer = useRef<Point | null>(null)
  const dragging = useRef(false)

  const place = () => {
    const el = ref.current
    const p = pointer.current
    if (!el || !p) return
    const { left, top } = floatPosition(p, grab.current, { width: el.offsetWidth, height: el.offsetHeight })
    el.style.transform = `translate(${left}px, ${top}px)`
    el.style.opacity = '1'
  }
  // After every render: a new look has a new size, the grab point must stay under the pointer
  useLayoutEffect(place)

  const follow = (p: Point | null) => {
    if (!p) return
    pointer.current = p
    const next = surfaceAt(p.x, p.y)
    setSurface((prev) => (prev?.id === next?.id ? prev : next))
    place()
  }

  const stop = () => {
    dragging.current = false
    pointer.current = null
    setItem(null)
    setSurface(null)
  }

  useDndMonitor({
    onDragStart: ({ active, activatorEvent }) => {
      const data = active.data.current as PanelDragData | undefined
      const object = objectOf(data)
      if (!data || !object) return
      const rect = active.rect.current.initial
      const start =
        activatorEvent instanceof MouseEvent
          ? { x: activatorEvent.clientX, y: activatorEvent.clientY }
          : rect
            ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            : null
      grab.current = start && rect ? grabFraction(start, rect) : { fx: 0.5, fy: 0.5 }
      dragging.current = true
      setItem({ label: data.label, icon: object.icon, kind: object.kind, objectId: object.objectId, grab: grab.current })
      follow(start)
    },
    onDragMove: (e) => dragging.current && follow(dragPoint(e)),
    onDragEnd: stop,
    onDragCancel: stop,
  })

  if (!item) return null
  const Icon = item.icon
  return createPortal(
    <div
      ref={ref}
      data-drag-float
      aria-hidden
      style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: 1000 }}
    >
      {/* A new surface: the new look grows in (keyed by surface) */}
      <div key={surface?.id ?? 'none'} className="animate-[float-in_150ms_ease-out] motion-reduce:animate-none">
        {surface ? (
          surface.look(item)
        ) : (
          <div className={buttonClass('secondary', !!Icon, 'whitespace-nowrap shadow-lg')}>
            {Icon && <Icon className="ms-(--btn-icon-offset-start) size-(--btn-icon-size)" />}
            {item.label}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
