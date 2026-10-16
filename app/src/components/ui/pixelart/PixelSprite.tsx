import { PALETTE, SPRITES, type SpriteName } from './sprites'

type Props = {
  name: SpriteName
  /** Size of one pixel on screen (px) */
  scale?: number
  className?: string
}

/** The sprite's rectangles: each run of neighbouring pixels of one colour in a row is one rectangle */
function runs(rows: readonly string[]) {
  const result: { x: number; y: number; width: number; color: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const letter = row[x]
      let end = x
      while (end + 1 < row.length && row[end + 1] === letter) end++
      if (letter !== '.' && PALETTE[letter]) result.push({ x, y, width: end - x + 1, color: PALETTE[letter] })
      x = end + 1
    }
  })
  return result
}

/** A pixel-art item (sprites.ts), drawn with hard edges at any size */
export default function PixelSprite({ name, scale = 4, className = '' }: Props) {
  const rows = SPRITES[name]
  const width = rows[0].length
  const height = rows.length
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={className}
    >
      {runs(rows).map((r) => (
        <rect key={`${r.x}:${r.y}`} x={r.x} y={r.y} width={r.width} height={1} fill={r.color} />
      ))}
    </svg>
  )
}
