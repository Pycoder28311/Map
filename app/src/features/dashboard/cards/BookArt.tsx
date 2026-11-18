import { BOOK_GRID, BOOK_PIXELS } from './book'

/** The pixel-art book of an article's card (book.ts: its pixels and colours), filling its box with crisp edges: every pixel of it a square */
export default function BookArt({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${BOOK_GRID} ${BOOK_GRID}`} shapeRendering="crispEdges" className={`pointer-events-none absolute inset-0 size-full ${className}`}>
      {BOOK_PIXELS.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  )
}
