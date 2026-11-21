import { useEffect, useMemo, useState } from 'react'
import { openCreate } from '../create/openCreate'
import PixelRects from './cards/PixelRects'
import { ARTICLE_PAPER, articleFrames, MAP_PAPER, mapFrames, SPRITE_H, SPRITE_W } from './createSprites'
import { STONE_BELOW_FACE, STONE_GREEN, STONE_PIXEL, STONE_PRESS, stonePixels, type StonePalette } from './stoneButton'

/** The buttons' size in pixels of the drawing (STONE_PIXEL px each): 16:7, 288 × 126px */
export const BIG_BUTTON_W = 96
export const BIG_BUTTON_H = 42

/** Where each animation sits on the face (pixels of the drawing): its paper centred on the face's height, as far from the face's left
 *  edge as from its top, and inside its light rim (the map's paper runs from the rim to the bottom bevel) */
function spriteAt(paper: readonly [number, number, number, number]): [x: number, y: number] {
  const [px, py, , ph] = paper
  const margin = Math.max(3, Math.floor((BIG_BUTTON_H - STONE_BELOW_FACE - ph) / 2))
  return [margin - px, margin - py]
}
const SPRITE_AT: Record<'map' | 'article', [x: number, y: number]> = { map: spriteAt(MAP_PAPER), article: spriteAt(ARTICLE_PAPER) }
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
 * A big Create button of the Dashboard: a stone slab in pixel art (stoneButton.ts: its edges copied from the reference), 16:7. On the left
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
  const [spriteX, spriteY] = SPRITE_AT[art]
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
        <span aria-hidden className="absolute" style={{ left: pctX(spriteX), top: pctY(spriteY), width: pctX(SPRITE_W), height: pctY(SPRITE_H) }}>
          {/* (the pencil or quill may reach past its box: not clipped) */}
          <PixelRects rects={frames[frame]} width={SPRITE_W} height={SPRITE_H} className="overflow-visible" />
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
