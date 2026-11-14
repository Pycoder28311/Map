// The small pixel-art ornaments of the article card's frame (ArticleCard): a round gem in a metal setting for the corners, a long
// diamond gem for the middle of the top and bottom edges, and the arrow caps at the ends of the title plaque. Each is a grid of
// letters (one per pixel, `.` for none) drawn as an SVG with crisp edges, so it stays sharp at any size.

/** Letter → colour. Metal (m: dark, M: light), gem (r: dark, R: mid, h: highlight), o: outline */
const PALETTE: Record<string, string> = {
  o: '#1a0a0c',
  m: '#6e4436',
  M: '#b98466',
  r: '#5c0d16',
  R: '#b3202f',
  h: '#f07a7a',
}

function Pixels({ rows, className = '' }: { rows: string[]; className?: string }) {
  const width = rows[0].length
  const height = rows.length
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} shapeRendering="crispEdges" className={className}>
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />)),
      )}
    </svg>
  )
}

const ROUND_GEM = [
  '...ooooo...',
  '..oMMMMMo..',
  '.oMmrrrmMo.',
  'oMmrRhRrmMo',
  'oMrRhRRRrMo',
  'oMrRRRRRrMo',
  'oMrRRRRrrMo',
  'oMmrRRrrmMo',
  '.oMmrrrmMo.',
  '..oMMMMMo..',
  '...ooooo...',
]

const LONG_GEM = [
  '....ooo....',
  '...oMMMo...',
  '..oMmhmMo..',
  '.oMmhRrmMo.',
  'oMmrhRRrmMo',
  'oMrRRRRRrMo',
  'oMmrRRRrmMo',
  '.oMmrRrmMo.',
  '..oMmrmMo..',
  '...oMMMo...',
  '....ooo....',
]

const ARROW_CAP = [
  '....oo',
  '...oMo',
  '..oMmo',
  '.oMmRo',
  'oMmRho',
  '.oMmRo',
  '..oMmo',
  '...oMo',
  '....oo',
]

/** The round gem at each corner of the frame */
export const RoundGem = ({ className }: { className?: string }) => <Pixels rows={ROUND_GEM} className={className} />
/** The long gem in the middle of the frame's top and bottom edges */
export const LongGem = ({ className }: { className?: string }) => <Pixels rows={LONG_GEM} className={className} />
/** The left end of the title plaque (the right end is the same, flipped) */
export const ArrowCap = ({ className }: { className?: string }) => <Pixels rows={ARROW_CAP} className={className} />
