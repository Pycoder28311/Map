import { useEffect, useMemo, useState } from 'react'
import { openCreate } from '../create/openCreate'
import PixelRects from './cards/PixelRects'
import { articleFrames, mapFrames, SPRITE_H, SPRITE_W } from './createSprites'
import { STONE_BELOW_FACE, STONE_GREEN, STONE_PIXEL, STONE_PRESS, stonePixels, type StonePalette } from './stoneButton'

/** The buttons' size in pixels of the drawing (STONE_PIXEL px each): 2:1, 300 × 150px */
export const BIG_BUTTON_W = 100
export const BIG_BUTTON_H = 50

/** Where the animation sits on the face (pixels of the drawing): in its left half, a small margin from the face's left and top edges */
const SPRITE_X = 5
const SPRITE_Y = 3
/** How long each frame of the animation shows (ms) */
const FRAME_MS = 110

type Props = {
  /** Its two lines of words, on the right half */
  lines: [string, string]
  /** What its animation shows: a pencil drawing a map, or a quill writing a page */
  art: 'map' | 'article'
  /** The Create modal's tab it opens on (a resource name, e.g. "maps") */
  kind: string
  palette?: StonePalette
}

/** The frame to show: it steps through `count` frames, over and over (the last one, still, for those who ask for less motion) */
function useFrame(count: number): number {
  const [frame, setFrame] = useState(0)
  const [still, setStill] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setStill(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (still) return
    const timer = setInterval(() => setFrame((f) => (f + 1) % count), FRAME_MS)
    return () => clearInterval(timer)
  }, [count, still])
  return still ? count - 1 : frame
}

/**
 * A big Create button of the Dashboard: a stone slab in pixel art (stoneButton.ts: its edges copied from the reference), 2:1. On the left
 * half of its face a little looping pixel animation in the slab's own colours shows what it makes (createSprites.ts); on the right half
 * its words, in two lines, in the blackletter pixel font. Its face (and all on it) sinks into the slab's thickness while pressed and is a
 * touch lighter on hover. It opens the Create modal (openCreate) on `kind`'s tab. Narrower on a small screen (its pixels scale down).
 */
export default function BigCreateButton({ lines, art, kind, palette = STONE_GREEN }: Props) {
  const width = BIG_BUTTON_W
  const height = BIG_BUTTON_H
  const { face, base } = useMemo(() => stonePixels(width, height, palette), [width, height, palette])
  const frames = useMemo(() => (art === 'map' ? mapFrames(palette) : articleFrames(palette)), [art, palette])
  const frame = useFrame(frames.length)
  const pctX = (n: number) => `${(n / width) * 100}%`
  const pctY = (n: number) => `${(n / height) * 100}%`
  const faceRows = height - STONE_BELOW_FACE
  return (
    <button
      type="button"
      onClick={() => openCreate(kind)}
      aria-label={lines.join(' ')}
      className="group/stone relative block min-w-0 flex-1 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight"
      style={{ maxWidth: width * STONE_PIXEL, aspectRatio: `${width} / ${height}` }}
    >
      <PixelRects rects={base} width={width} height={height} />
      {/* The face and all on it: they sink together while pressed */}
      <span
        className="absolute inset-0 transition-[translate,filter] duration-75 group-hover/stone:brightness-105 group-active/stone:translate-y-(--stone-press) motion-reduce:transition-none"
        style={{ ['--stone-press' as string]: pctY(STONE_PRESS) }}
      >
        <PixelRects rects={face} width={width} height={height} />
        {/* What it makes, drawing itself */}
        <span aria-hidden className="absolute" style={{ left: pctX(SPRITE_X), top: pctY(SPRITE_Y), width: pctX(SPRITE_W), height: pctY(SPRITE_H) }}>
          <PixelRects rects={frames[frame]} width={SPRITE_W} height={SPRITE_H} />
        </span>
        <span
          aria-hidden
          className="absolute flex flex-col items-start justify-center font-(family-name:--font-display) text-[clamp(1.5rem,5vw,2.6rem)] leading-[0.95] select-none"
          style={{ left: pctX(width / 2 - 2), top: 0, width: pctX(width / 2 - 4), height: pctY(faceRows), color: palette.ink }}
        >
          <span>{lines[0]}</span>
          <span>{lines[1]}</span>
        </span>
      </span>
    </button>
  )
}
