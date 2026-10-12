import { useEffect, useId, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { chooseToShare, stopSharing, useShareState } from './shareStore'

/** Room around each highlighted object (px) */
const PAD = 4
const RADIUS = 10

type Target = { id: string; x: number; y: number; w: number; h: number }

/** Where an element can be seen: its rect cut by its scrolling ancestors (e.g. the sidebar's list); null if hidden */
function visibleRect(el: HTMLElement): DOMRect | null {
  let r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return null
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const style = getComputedStyle(p)
    if (style.visibility === 'hidden') return null
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
    const c = p.getBoundingClientRect()
    const left = Math.max(r.left, c.left)
    const top = Math.max(r.top, c.top)
    const right = Math.min(r.right, c.right)
    const bottom = Math.min(r.bottom, c.bottom)
    if (right - left < 4 || bottom - top < 4) return null
    r = new DOMRect(left, top, right - left, bottom - top)
  }
  return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight ? r : null
}

/** Every shareable object on screen ([data-share-id]) */
function measure(): Target[] {
  const targets: Target[] = []
  for (const el of document.querySelectorAll<HTMLElement>('[data-share-id]')) {
    const id = el.dataset.shareId
    const r = id ? visibleRect(el) : null
    if (r) targets.push({ id: id!, x: r.left - PAD, y: r.top - PAD, w: r.width + 2 * PAD, h: r.height + 2 * PAD })
  }
  return targets
}

/** The most specific target under a point (a row inside a pane wins over the pane) */
const targetAt = (targets: Target[], x: number, y: number) =>
  targets
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h)
    .sort((a, b) => a.t.w * a.t.h - b.t.w * b.t.h)[0]

/**
 * Share mode (Share in the navbar): the screen goes dark except the objects that can be shared (sidebar
 * rows, panes, rows and cards on the page: [data-share-id]), each popping out with a ring. One dark
 * layer with holes cut where they are (the page and the sidebar are separate stacking contexts, so the
 * objects themselves can't be raised over it); it takes the clicks and finds the object under the
 * pointer. Esc or a click elsewhere stops it. Under the navbar, so the Share popout stays visible.
 */
export default function ShareMode() {
  const { phase, chosenId } = useShareState()
  const maskId = useId()
  const [targets, setTargets] = useState<Target[]>([])
  const [hover, setHover] = useState<number | null>(null)
  // The chosen object's ring, flashing once as the screen comes back
  const [flash, setFlash] = useState<Target | null>(null)

  // Measured when it starts, and again on scroll / resize (one frame at most)
  useLayoutEffect(() => {
    if (phase !== 'choosing') return
    setTargets(measure())
    let frame = 0
    const again = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setTargets(measure()))
    }
    window.addEventListener('scroll', again, true)
    window.addEventListener('resize', again)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', again, true)
      window.removeEventListener('resize', again)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'choosing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopSharing()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phase])

  useEffect(() => {
    if (phase !== 'chosen' || !chosenId) return
    setFlash(targets.find((t) => t.id === chosenId) ?? null)
    const timer = window.setTimeout(() => setFlash(null), 600)
    return () => window.clearTimeout(timer)
    // Only when one is chosen (targets are the ones measured while choosing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chosenId])

  if (phase === 'chosen' && flash) {
    return createPortal(
      <svg aria-hidden className="pointer-events-none fixed inset-0 z-[29] size-full animate-share-flash">
        <rect x={flash.x} y={flash.y} width={flash.w} height={flash.h} rx={RADIUS} fill="none" stroke="var(--drop)" strokeWidth={3} />
      </svg>,
      document.body,
    )
  }
  if (phase !== 'choosing') return null

  // On click (not press), so the release never lands on what's under the overlay once it's gone
  const pick = (e: React.MouseEvent) => {
    const hit = targetAt(targets, e.clientX, e.clientY)
    if (hit) chooseToShare(hit.t.id)
    else stopSharing()
  }

  return createPortal(
    // data-popout-keep: clicking here doesn't close the Share popout (BarPopout)
    <svg
      data-popout-keep
      role="presentation"
      onClick={pick}
      onPointerMove={(e) => setHover(targetAt(targets, e.clientX, e.clientY)?.i ?? null)}
      onPointerLeave={() => setHover(null)}
      className={`fixed inset-0 z-[29] size-full ${hover !== null ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {targets.map((t, i) => (
            <rect key={i} x={t.x} y={t.y} width={t.w} height={t.h} rx={RADIUS} fill="black" />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="black" opacity={0.7} mask={`url(#${maskId})`} className="animate-[labels-in_200ms_ease-out]" />
      {targets.map((t, i) => (
        <rect
          key={i}
          x={t.x}
          y={t.y}
          width={t.w}
          height={t.h}
          rx={RADIUS}
          fill={hover === i ? 'rgb(255 255 255 / 0.12)' : 'transparent'}
          stroke="white"
          strokeOpacity={hover === i ? 1 : 0.7}
          strokeWidth={hover === i ? 3 : 2}
          style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
          className="origin-center animate-share-pop transition-[stroke-width,stroke-opacity,fill] duration-150 [transform-box:fill-box] motion-reduce:animate-none"
        />
      ))}
    </svg>,
    document.body,
  )
}
