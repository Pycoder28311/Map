import { useEffect, useMemo, useRef } from 'react'
import { seededRandom } from '../../../lib/seededRandom'
import { hueOf } from '../../objects/placeholderArt'

// Two continent outlines, in a 100 × 100 box
const CONTINENTS = [
  'M18 40 C 12 28, 28 14, 44 16 C 58 8, 78 14, 84 30 C 94 40, 88 58, 76 64 C 72 80, 52 90, 40 82 C 30 76, 34 66, 24 62 C 14 58, 22 50, 18 40 Z',
  'M22 30 C 34 12, 62 10, 78 24 C 90 36, 84 52, 70 56 C 66 70, 58 86, 46 88 C 40 76, 44 64, 32 58 C 18 52, 14 40, 22 30 Z',
]

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const MAP = {
  sea: '#a9d7ee',
  /** The faint lines of latitude and longitude on the sea */
  grid: '#c0e3f4',
  /** The shallow water round the coasts, and the sand on them */
  shallow: '#c8eaf6',
  sand: '#ebe2b4',
  /** The land, its forests and its lighter plains */
  land: '#a3d48f',
  forest: '#82c072',
  plain: '#bfe0a2',
  /** The pin */
  pin: '#d6453d',
  pinEdge: '#7a1f1a',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The map's picture as an SVG document: the id picks the continent, flips it or not, and scatters its forests, lake and islands */
function mapSvg(id: string): string {
  const hue = hueOf(id)
  const next = seededRandom(`${id}:map`)
  const land = CONTINENTS[hue % CONTINENTS.length]
  const flip = hue % 3 === 1 ? 'translate(100 0) scale(-1 1)' : ''
  const at = (from: number, span: number) => (from + next() * span).toFixed(1)
  const forests = Array.from({ length: 5 }, () => `<circle cx="${at(25, 50)}" cy="${at(25, 50)}" r="${at(5, 6)}" fill="${MAP.forest}"/>`).join('')
  const plains = Array.from({ length: 3 }, () => `<ellipse cx="${at(28, 44)}" cy="${at(28, 44)}" rx="${at(5, 5)}" ry="${at(3, 4)}" fill="${MAP.plain}"/>`).join('')
  const lake = `<ellipse cx="${at(42, 16)}" cy="${at(38, 16)}" rx="3.2" ry="2.2" fill="${MAP.sea}"/>`
  // Islands in the corners' sea: a sand ring round a green dot, with its shallows
  const islands = [
    [8 + next() * 10, 80 + next() * 10],
    [82 + next() * 8, 76 + next() * 12],
    [80 + next() * 10, 8 + next() * 8],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${MAP.shallow}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${MAP.sand}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${MAP.land}"/>`,
    )
    .join('')
  const grid = [20, 40, 60, 80].map((v) => `<path d="M${v} 0V100M0 ${v}H100" stroke="${MAP.grid}" stroke-width="0.8"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
<defs><clipPath id="l"><path d="${land}"/></clipPath></defs>
<rect width="100" height="100" fill="${MAP.sea}"/>${grid}${islands}
<g transform="${flip}">
<path d="${land}" fill="${MAP.shallow}" stroke="${MAP.shallow}" stroke-width="8" stroke-linejoin="round"/>
<path d="${land}" fill="${MAP.sand}" stroke="${MAP.sand}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="${land}" fill="${MAP.land}"/>
<g clip-path="url(#l)">${plains}${forests}${lake}</g>
</g>
<path d="M50 33c-6 0-10.5 4.6-10.5 10.3C39.5 51 50 61 50 61s10.5-10 10.5-17.7C60.5 37.6 56 33 50 33z" fill="${MAP.pin}" stroke="${MAP.pinEdge}" stroke-width="2"/>
<circle cx="50" cy="43.5" r="3.6" fill="#fff"/>
</svg>`
}

const urlOf = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

/**
 * A map's picture, until a map has a drawing to show: a continent on a light blue sea (shallows and sand round its coast, forests and
 * plains on it, a lake), a few islands, faint grid lines and a pin. The id picks the shape and scatters the rest, so maps differ.
 * `grid`: drawn as pixel art, that many pixels across (each a square, scaled up with hard edges), as on the Dashboard's map card; else smooth.
 */
export default function MapPreview({ id, className = '', grid }: { id: string; className?: string; grid?: number }) {
  const url = useMemo(() => urlOf(mapSvg(id)), [id])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!grid || !canvas) return
    const image = new Image()
    image.onload = () => {
      const context = canvas.getContext('2d')
      if (!context) return
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, grid, grid)
      context.drawImage(image, 0, 0, grid, grid)
    }
    image.src = url
  }, [url, grid])
  if (grid) return <canvas ref={canvasRef} aria-hidden width={grid} height={grid} className={`[image-rendering:pixelated] ${className}`} />
  return <img src={url} alt="" aria-hidden draggable={false} className={`object-cover ${className}`} />
}
