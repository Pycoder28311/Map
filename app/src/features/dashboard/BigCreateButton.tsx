import { useMemo } from 'react'
import { openCreate } from '../create/openCreate'
import PixelRects from './cards/PixelRects'
import { STONE_BELOW_FACE, STONE_GREEN, STONE_PIXEL, STONE_PRESS, stonePixels, type StonePalette } from './stoneButton'

/** The buttons' size in pixels of the drawing (STONE_PIXEL px each): 3:2, 297 × 198px */
export const BIG_BUTTON_W = 99
export const BIG_BUTTON_H = 66

type Props = {
  /** The word on it */
  label: string
  /** The Create modal's tab it opens on (a resource name, e.g. "maps"); none: the last one used */
  kind?: string
  palette?: StonePalette
}

/**
 * A big Create button of the Dashboard: a stone slab in pixel art (stoneButton.ts: its edges copied from the reference), 3:2, with its
 * word on it in the blackletter pixel font. Its face sinks into the slab's thickness while pressed and is a touch lighter on hover. It
 * opens the Create modal (openCreate), on `kind`'s tab. As wide as its pixels allow, narrower on a small screen (its pixels scale down).
 */
export default function BigCreateButton({ label, kind, palette = STONE_GREEN }: Props) {
  const width = BIG_BUTTON_W
  const height = BIG_BUTTON_H
  const { face, base } = useMemo(() => stonePixels(width, height, palette), [width, height, palette])
  const pct = (rows: number) => `${(rows / height) * 100}%`
  return (
    <button
      type="button"
      onClick={() => openCreate(kind)}
      className="group/stone relative block min-w-0 flex-1 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight"
      style={{ maxWidth: width * STONE_PIXEL, aspectRatio: `${width} / ${height}` }}
    >
      <PixelRects rects={base} width={width} height={height} />
      {/* The face and its word: they sink together while pressed */}
      <span
        className="absolute inset-0 transition-[translate,filter] duration-75 group-hover/stone:brightness-105 group-active/stone:translate-y-(--stone-press) motion-reduce:transition-none"
        style={{ ['--stone-press' as string]: pct(STONE_PRESS) }}
      >
        <PixelRects rects={face} width={width} height={height} />
        <span
          className="absolute inset-x-0 top-0 flex items-center justify-center px-[6%] text-center font-(family-name:--font-display) text-[clamp(1.75rem,6vw,3.75rem)] leading-[0.95] select-none"
          style={{ height: pct(height - STONE_BELOW_FACE), color: palette.ink }}
        >
          {label}
        </span>
      </span>
    </button>
  )
}
