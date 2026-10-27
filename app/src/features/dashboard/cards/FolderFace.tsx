import { useLayoutEffect, useRef } from 'react'
import { LuImagePlus, LuPlus } from 'react-icons/lu'
import type { Entry } from '../../../lib/resource/reorder'
import MapPreview from './MapPreview'

/** How many items a folder card shows */
export const FOLDER_TILES = 4

/** One tile of a folder card: a small preview of an item (a map's picture, else its icon) and its title below it */
function Tile({ entry, icon = 'size-5', pin = 'size-5', text = 'text-[10px]', className = '' }: { entry: Entry; icon?: string; pin?: string; text?: string; className?: string }) {
  const { resource, item } = entry
  const Icon = resource.ui.icon
  const title = resource.ui.row.title(item)
  const name = <span className={`block w-full truncate px-1 text-center leading-tight text-fg ${text}`}>{title}</span>
  return (
    <div data-tile-key={`${resource.name}:${item.id}`} title={title} className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-(--btn-radius) bg-surface ${className}`}>
      {resource.ui.card === 'map' ? (
        <>
          <MapPreview id={String(item.id)} pin={pin} className="min-h-0 w-full flex-1" />
          <span className="w-full bg-surface py-0.5">{name}</span>
        </>
      ) : (
        <>
          <Icon aria-hidden className={`${icon} shrink-0 text-fg-muted`} />
          {name}
        </>
      )}
    </div>
  )
}

/** The tile a draft card made from this folder points at: dashed, with a + (the draft's lines are drawn to it: data-folder-draft-square) */
function DraftTile({ className = '' }: { className?: string }) {
  return (
    <div data-tile-key="draft" data-folder-draft-square aria-hidden className={`flex min-w-0 items-center justify-center rounded-(--btn-radius) border-2 border-dashed border-drop bg-drop/10 ${className}`}>
      <LuPlus className="size-5 text-drop" />
    </div>
  )
}

/**
 * Inside a folder card (its name is the card's, floating on its corner): its items as tiles, bigger the fewer there are: none, one dashed square (drop
 * objects here); one, a big tile; two, side by side and a little less tall; three, two above one centred (all the same size); four or more
 * (the first four): a 2×2 grid. `pending`: a draft card is being made from it: its dashed tile comes first, among the items. While an item is dragged over it (`dropping`), the dashed square shows instead, whatever it holds.
 */
type Props = { contents: Entry[]; dropping?: boolean; pending?: boolean }

/** The grid and the tile of each count (Tailwind needs the full class strings): one grid for all of them, so a tile is the same element when the count changes */
const GRID = ['', 'grid-cols-1 grid-rows-1', 'grid-cols-2 grid-rows-[1fr] items-center', 'grid-cols-4 grid-rows-2', 'grid-cols-2 grid-rows-2']
const BIG = [{}, { icon: 'size-10', pin: 'size-10', text: 'text-small' }, { icon: 'size-6', pin: 'size-6' }, {}, {}]
/** How long a tile takes to go to its new place and size, or to appear (ms) */
const MOVE_MS = 320

export default function FolderFace({ contents, dropping = false, pending = false }: Props) {
  const shown: (Entry | 'draft')[] = [...(pending ? (['draft'] as const) : []), ...contents].slice(0, FOLDER_TILES)
  const n = shown.length
  const keyOf = (entry: Entry | 'draft') => (entry === 'draft' ? 'draft' : `${entry.resource.name}:${entry.item.id}`)
  const spans = (i: number) => (n === 2 ? 'h-4/5' : n === 3 ? (i === 2 ? 'col-span-2 col-start-2' : 'col-span-2') : '')

  // A tile that changes place or size (the count changed, a tile came or went) glides there from where it was (FLIP, measured from
  // the grid's own corner so the card moving doesn't count); one that is new grows in
  const grid = useRef<HTMLDivElement>(null)
  const before = useRef<Map<string, DOMRect> | null>(null)
  const signature = shown.map(keyOf).join('|')
  useLayoutEffect(() => {
    const box = grid.current
    if (!box) {
      before.current = null
      return
    }
    const origin = box.getBoundingClientRect()
    const next = new Map<string, DOMRect>()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The dashed tile of a draft goes and a tile comes in its place (the draft was made: its card has flown onto it): it only fades in, no pop
    const handedOver = before.current?.has('draft') === true && !box.querySelector('[data-tile-key="draft"]')
    box.querySelectorAll<HTMLElement>('[data-tile-key]').forEach((tile) => {
      const r = tile.getBoundingClientRect()
      const rel = new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height)
      next.set(tile.dataset.tileKey!, rel)
      const old = before.current?.get(tile.dataset.tileKey!)
      if (reduced || !before.current) return
      if (old) {
        if (Math.abs(old.x - rel.x) + Math.abs(old.y - rel.y) + Math.abs(old.width - rel.width) + Math.abs(old.height - rel.height) < 1) return
        tile.animate(
          [{ transformOrigin: 'top left', transform: `translate(${old.x - rel.x}px, ${old.y - rel.y}px) scale(${old.width / rel.width}, ${old.height / rel.height})` }, { transformOrigin: 'top left', transform: 'none' }],
          { duration: MOVE_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        )
      } else if (handedOver) {
        tile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' })
      } else {
        tile.animate([{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], { duration: MOVE_MS, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.1)' })
      }
    })
    before.current = next
  }, [signature, dropping])

  return (
    <>
      {(n === 0 || dropping) && (
        <div
          data-card-body
          className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-(--btn-radius) border-2 border-dashed text-center text-small transition-colors ${
            dropping ? 'border-drop bg-drop/10 text-fg' : 'border-line-strong text-fg-subtle'
          }`}
        >
          <LuImagePlus aria-hidden className="size-6" />
          Drop objects here
        </div>
      )}
      {!dropping && n > 0 && (
        <div ref={grid} data-card-body className={`grid min-h-0 flex-1 gap-2 ${GRID[n]}`}>
          {shown.map((entry, i) =>
            entry === 'draft' ? (
              <DraftTile key="draft" className={spans(i)} />
            ) : (
              <Tile key={keyOf(entry)} entry={entry} {...BIG[n]} className={spans(i)} />
            ),
          )}
        </div>
      )}
    </>
  )
}
