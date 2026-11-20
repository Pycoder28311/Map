import { openCreate } from '../create/openCreate'
import PixelRects from './cards/PixelRects'
import { STONE, STONE_BASE, STONE_FACE, STONE_FACE_ROWS, STONE_H, STONE_PIXEL, STONE_PRESS, STONE_W } from './stoneButton'

const pct = (rows: number) => `${(rows / STONE_H) * 100}%`

/**
 * The Dashboard's big Create button: a pale stone slab in pixel art (stoneButton.ts) with "Create" on it in the blackletter pixel font.
 * Its face sinks into the slab's thickness while pressed and is a touch lighter on hover. It opens the Create modal (openCreate), as
 * the floating Create button does. As wide as STONE_W pixels allow, narrower on a small screen (its pixels scale down with it).
 */
export default function BigCreateButton() {
  return (
    <button
      type="button"
      onClick={openCreate}
      aria-label="Create"
      className="group/stone relative mx-auto block cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight"
      style={{ width: `min(${STONE_W * STONE_PIXEL}px, 100%)`, aspectRatio: `${STONE_W} / ${STONE_H}` }}
    >
      <PixelRects rects={STONE_BASE} width={STONE_W} height={STONE_H} />
      {/* The face and its word: they sink together while pressed */}
      <span
        className="absolute inset-0 transition-[translate,filter] duration-75 group-hover/stone:brightness-105 group-active/stone:translate-y-(--stone-press) motion-reduce:transition-none"
        style={{ ['--stone-press' as string]: pct(STONE_PRESS) }}
      >
        <PixelRects rects={STONE_FACE} width={STONE_W} height={STONE_H} />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 flex items-center justify-center font-(family-name:--font-display) text-[clamp(2rem,11vw,4rem)] leading-none select-none"
          style={{ height: pct(STONE_FACE_ROWS), color: STONE.ink }}
        >
          Create
        </span>
      </span>
    </button>
  )
}
