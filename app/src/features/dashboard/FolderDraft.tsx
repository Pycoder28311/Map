import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AnyResource } from '../../resources/types'
import { CARD_SIZE } from './cards/cardStyles'
import DraftCard from './DraftCard'

/** How long the card takes to fly into its tile, and the lines to fade (ms) */
const FLY_MS = 400
/** When the card is on its tile and starts to fade into it (ms): the tile's own look comes in under it */
const LAND_MS = 250
/** How far right of the folder card the draft card floats (px) */
const GAP = 16

type Props = {
  /** `<resource>:<id>` of the folder card it comes from */
  folderKey: string
  resource: AnyResource
  initial: Record<string, unknown>
  onCreated: (id: string) => void
  /** The card has landed on its tile (it now fades into it): the item's own tile takes the dashed one's place */
  onLanded: () => void
  onDone: () => void
}

type Box = { left: number; top: number; right: number; bottom: number }
const boxOf = (el: Element | null): Box | null => {
  const r = el?.getBoundingClientRect()
  return r && r.width > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null
}

/**
 * A draft card made from a folder card (its + menu): it floats to the right of the folder, and the folder shows a dashed tile for it
 * (FolderFace `pending`); four lines join each corner of the tile to the same corner of the draft. Follows the folder as the row scrolls.
 * The draft is the same DraftCard as in a row: Create makes it inside the folder, and the new tile takes the dashed one's place.
 */
export default function FolderDraft({ folderKey, resource, initial, onCreated, onLanded, onDone }: Props) {
  const [boxes, setBoxes] = useState<{ folder: Box; tile: Box | null } | null>(null)
  const frame = useRef(0)
  // Created: once the card has settled it flies into its tile (moved and shrunk onto it), then it is gone and the tile is the item's own
  const [flying, setFlying] = useState<{ dx: number; dy: number; sx: number; sy: number } | null>(null)
  const created = useRef(false)

  // Follows the folder and its dashed tile (the row scrolls sideways, the page scrolls, the window resizes)
  useEffect(() => {
    const follow = () => {
      const card = document.querySelector(`[data-flip-card="${CSS.escape(folderKey)}"]`)
      const folder = boxOf(card)
      if (folder) setBoxes((prev) => ({ folder, tile: boxOf(card?.querySelector('[data-folder-draft-square]') ?? null) ?? prev?.tile ?? null }))
      frame.current = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame.current)
  }, [folderKey])

  const settled = () => {
    const card = boxes
    if (!created.current || !card?.tile || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDone()
    const left = card.folder.right + GAP
    setFlying({ dx: card.tile.left - left, dy: card.tile.top - card.folder.top, sx: (card.tile.right - card.tile.left) / 192, sy: (card.tile.bottom - card.tile.top) / 192 })
    window.setTimeout(onLanded, LAND_MS)
    window.setTimeout(onDone, FLY_MS)
  }

  if (!boxes) return null
  const left = boxes.folder.right + GAP
  const top = boxes.folder.top
  const size = 192 // CARD_SIZE (size-48)
  const tile = boxes.tile
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-40">
      {tile && (
        <svg aria-hidden className={`absolute inset-0 size-full overflow-visible transition-opacity duration-300 ${flying ? 'opacity-0' : ''}`}>
          <g className="stroke-drop" strokeWidth={1.5} strokeDasharray="4 3" fill="none">
            {/* Each corner of the tile to the same corner of the card, under the card. The two to the card's far corners go behind it
                (across it): fainter than the two in front */}
            <line x1={tile.left} y1={tile.top} x2={left} y2={top} />
            <line x1={tile.left} y1={tile.bottom} x2={left} y2={top + size} />
            <line x1={tile.right} y1={tile.top} x2={left + size} y2={top} opacity={0.3} />
            <line x1={tile.right} y1={tile.bottom} x2={left + size} y2={top + size} opacity={0.3} />
          </g>
        </svg>
      )}
      <div
        style={{
          left,
          top,
          transformOrigin: 'top left',
          transform: flying ? `translate(${flying.dx}px, ${flying.dy}px) scale(${flying.sx}, ${flying.sy})` : undefined,
        }}
        className={`pointer-events-auto absolute ${CARD_SIZE} transition-[transform,opacity] ease-in-out [transition-duration:400ms,150ms] ${
          // It flies (all of FLY_MS), and in its last part fades into the tile under it
          flying ? 'opacity-0 [transition-delay:0ms,250ms]' : ''
        }`}
      >
        <DraftCard
          resource={resource}
          initial={initial}
          onCreated={(id) => {
            created.current = true
            onCreated(id)
          }}
          onDone={settled}
        />
      </div>
    </div>,
    document.body,
  )
}
