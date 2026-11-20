import { useMemo } from 'react'
import { openCreate } from '../create/openCreate'
import PixelRects from './cards/PixelRects'
import { STONE_FACE_ROWS, STONE_GREEN, STONE_H, STONE_PIXEL, STONE_PRESS, stonePixels, type StonePalette } from './stoneButton'

const pct = (rows: number) => `${(rows / STONE_H) * 100}%`

type Props = {
  /** The word on it */
  label: string
  /** The Create modal's tab it opens on (a resource name, e.g. "maps"); none: the last one used */
  kind?: string
  /** Its width in pixels of the drawing (STONE_PIXEL px each) */
  width?: number
  palette?: StonePalette
}

/**
 * A big Create button of the Dashboard: a stone slab in pixel art (stoneButton.ts: its edges copied from the reference) with its word on
 * it in the blackletter pixel font. Its face sinks into the slab's thickness while pressed and is a touch lighter on hover. It opens the
 * Create modal (openCreate), on `kind`'s tab. As wide as its pixels allow, narrower on a small screen (its pixels scale down with it).
 */
export default function BigCreateButton({ label, kind, width = 110, palette = STONE_GREEN }: Props) {
  const { face, base } = useMemo(() => stonePixels(width, palette), [width, palette])
  return (
    <button
      type="button"
      onClick={() => openCreate(kind)}
      className="group/stone relative block min-w-0 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight"
      style={{ width: `min(${width * STONE_PIXEL}px, 100%)`, aspectRatio: `${width} / ${STONE_H}` }}
    >
      <PixelRects rects={base} width={width} height={STONE_H} />
      {/* The face and its word: they sink together while pressed */}
      <span
        className="absolute inset-0 transition-[translate,filter] duration-75 group-hover/stone:brightness-105 group-active/stone:translate-y-(--stone-press) motion-reduce:transition-none"
        style={{ ['--stone-press' as string]: pct(STONE_PRESS) }}
      >
        <PixelRects rects={face} width={width} height={STONE_H} />
        <span
          className="absolute inset-x-0 top-0 flex items-center justify-center font-(family-name:--font-display) text-[clamp(1.75rem,7vw,3.5rem)] leading-none whitespace-nowrap select-none"
          style={{ height: pct(STONE_FACE_ROWS), color: palette.ink }}
        >
          {label}
        </span>
      </span>
    </button>
  )
}
