import { useEffect, useMemo, useState } from 'react'
import { openCreate } from '../create/openCreate'
import PixelRects from './cards/PixelRects'
import { ARTICLE_PAPER, articleFrames, MAP_PAPER, mapFrames, SPRITE_H, SPRITE_W } from './createSprites'
import { mapFacePixels, mapPencilFrames } from './mapFace'
import { STONE_BELOW_FACE, STONE_GREEN, STONE_PIXEL, STONE_PRESS, stonePixels, type StonePalette } from './stoneButton'

/** The buttons' size in pixels of the drawing (STONE_PIXEL px each): 16:7, 288 × 126px */
export const BIG_BUTTON_W = 96
export const BIG_BUTTON_H = 42

/** How thick the face's light rim is along its top and left (pixels of the drawing): the drawings keep clear of it */
const RIM = 3
/** Where each animation sits on the face (pixels of the drawing): its paper centred between the light rim and the bottom bevel, as far from
 *  the rim on the left as above and below, so it stands apart from the button's edges */
function spriteAt(paper: readonly [number, number, number, number]): [x: number, y: number] {
  const [px, py, , ph] = paper
  const inner = BIG_BUTTON_H - STONE_BELOW_FACE - RIM
  const margin = RIM + Math.max(1, Math.floor((inner - ph) / 2))
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

/** The frame of an animation that plays only while `on` (none while off); `restart` starts it from its first frame */
function usePlayWhile(on: boolean, count: number): { frame: number | null; restart: () => void } {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!on || count === 0) return
    const timer = setInterval(() => setFrame((f) => (f + 1) % count), FRAME_MS)
    return () => clearInterval(timer)
  }, [on, count])
  return { frame: on ? frame : null, restart: () => setFrame(0) }
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
 * half of its face a little looping pixel animation in the slab's own colours shows what it makes (createSprites.ts), or, for the map,
 * the whole face inside the rim is a pixel map (mapFace.ts); on the right half its words, in two lines, in the blackletter pixel font. Its face (and all on it) sinks into the slab's thickness while pressed and is a
 * touch lighter on hover. It opens the Create modal (openCreate) on `kind`'s tab. Narrower on a small screen (its pixels scale down).
 */
export default function BigCreateButton({ lines, art, kind, palette = STONE_GREEN }: Props) {
  const width = BIG_BUTTON_W
  const height = BIG_BUTTON_H
  const { face, base } = useMemo(() => stonePixels(width, height, palette), [width, height, palette])
  const frames = useMemo(() => (art === 'map' ? mapFrames(palette) : articleFrames(palette)), [art, palette])
  const frame = useFrame(frames.length)
  // The map button's whole face, inside its light rim, is a map (mapFace.ts)
  const [mx1, my1] = [width - 7, height - STONE_BELOW_FACE - 2]
  const map = useMemo(() => (art === 'map' ? mapFacePixels(3, 3, mx1, my1) : null), [art, mx1, my1])
  // On the map: while hovered, a pencil draws a route across the island
  const [hovered, setHovered] = useState(false)
  const pencilFrames = useMemo(() => (art === 'map' ? mapPencilFrames(3, 3, mx1, my1, palette) : []), [art, mx1, my1, palette])
  const { frame: pencilFrame, restart: restartPencil } = usePlayWhile(hovered && art === 'map', pencilFrames.length)
  const pctX = (n: number) => `${(n / width) * 100}%`
  const pctY = (n: number) => `${(n / height) * 100}%`
  const faceRows = height - STONE_BELOW_FACE
  const [spriteX, spriteY] = SPRITE_AT[art]
  return (
    <button
      type="button"
      onClick={() => openCreate(kind)}
      onPointerEnter={() => {
        restartPencil()
        setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
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
        {map ? (
          // The map button: its face a map, land with a bay of sea (and an island in it) on its left
          <>
            <PixelRects rects={map} width={width} height={height} />
            {pencilFrame !== null && <PixelRects rects={pencilFrames[pencilFrame]} width={width} height={height} className="overflow-visible" />}
          </>
        ) : (
          // What it makes, drawing itself (the quill may reach past its box: not clipped)
          <span aria-hidden className="absolute" style={{ left: pctX(spriteX), top: pctY(spriteY), width: pctX(SPRITE_W), height: pctY(SPRITE_H) }}>
            <PixelRects rects={frames[frame]} width={SPRITE_W} height={SPRITE_H} className="overflow-visible" />
          </span>
        )}
        <span
          aria-hidden
          className="absolute flex flex-col items-start justify-center font-(family-name:--font-display) text-[clamp(1.75rem,6vw,3.1rem)] leading-[0.9] select-none"
          style={{
            left: pctX(width / 2 - 3),
            top: 0,
            width: pctX(width / 2 - 2),
            height: pctY(faceRows),
            color: palette.ink,
            // on the map, a light outline so the words read over the land
            textShadow: map ? '0 0 2px rgb(236 242 222 / 0.95), 0 0 6px rgb(236 242 222 / 0.6)' : undefined,
          }}
        >
          <span>{lines[0]}</span>
          <span>{lines[1]}</span>
        </span>
      </span>
    </button>
  )
}
