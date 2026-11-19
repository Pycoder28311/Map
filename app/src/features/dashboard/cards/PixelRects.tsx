/** A pixel-art drawing from its rectangles ([x, y, width, height, colour], in pixels of a `width` × `height` grid), filling its box with crisp
 *  edges: every pixel of it a square. The Dashboard cards' art (book.ts, stoneFrame.ts) is drawn with it */
export default function PixelRects({ rects, width, height, className = '' }: { rects: readonly (readonly [number, number, number, number, string])[]; width: number; height: number; className?: string }) {
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} shapeRendering="crispEdges" className={`pointer-events-none absolute inset-0 size-full ${className}`}>
      {rects.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  )
}
