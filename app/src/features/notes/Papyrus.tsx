// Full class strings so Tailwind can detect them at build time.
const MOVE = 'transition-[transform,opacity] duration-700 ease-out motion-reduce:transition-none'
// transform-box: the SVG transforms are in the element's own box, not the picture's
const OWN_BOX = '[transform-box:fill-box]'

// How far the sheet reaches when it is unrolled (the picture's units)
const SHEET = 62

/** One end of a roll: the cut face of the paper, with the turns of the spiral */
function Cap({ cx, cy, ry }: { cx: number; cy: number; ry: number }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={ry * 0.42} ry={ry} fill="#d9c08a" stroke="#7d5f30" strokeWidth="0.8" />
      <ellipse cx={cx} cy={cy} rx={ry * 0.26} ry={ry * 0.62} fill="none" stroke="#8a6b3a" strokeWidth="0.7" />
      <ellipse cx={cx} cy={cy} rx={ry * 0.1} ry={ry * 0.26} fill="#8a6b3a" />
    </>
  )
}

/** A rolled sheet lying across, shaded like a cylinder (light in the middle, darker at its top and bottom edges) */
function Roll({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const ry = h / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#papyrus-roll)" />
      <path d={`M${x} ${y + 0.4}H${x + w}M${x} ${y + h - 0.4}H${x + w}`} stroke="#6f532a" strokeWidth="0.9" />
      <Cap cx={x} cy={y + ry} ry={ry} />
      <Cap cx={x + w} cy={y + ry} ry={ry} />
    </g>
  )
}

/**
 * The papyrus behind the big input (Dashboard), drawn as a picture. Folded, it is a roll with a rope wound round it; open, the rope
 * slips off and the sheet unrolls downward: the sheet grows from under the top roll while the roll it is wound on drops to its
 * bottom, the way a scroll is let go.
 */
export default function Papyrus({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 92"
      className={`overflow-visible [filter:drop-shadow(0_2px_2px_rgb(0_0_0/0.5))] ${className}`}
    >
      <defs>
        <linearGradient id="papyrus-roll" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a98652" />
          <stop offset="0.3" stopColor="#f0dfb4" />
          <stop offset="0.55" stopColor="#e3cc98" />
          <stop offset="1" stopColor="#a58250" />
        </linearGradient>
        <linearGradient id="papyrus-sheet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cdb27a" />
          <stop offset="0.12" stopColor="#ecdcb0" />
          <stop offset="0.88" stopColor="#e6d4a4" />
          <stop offset="1" stopColor="#c6aa72" />
        </linearGradient>
        <linearGradient id="papyrus-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.25" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* The sheet: grows from under the top roll */}
      <g style={{ transform: open ? 'scaleY(1)' : 'scaleY(0.02)' }} className={`${OWN_BOX} origin-top ${MOVE}`}>
        <rect x="8" y="10" width="48" height={SHEET} fill="url(#papyrus-sheet)" />
        <rect x="8" y="10" width="48" height={SHEET} fill="url(#papyrus-fade)" />
        <path d="M8 10V72M56 10V72" stroke="#8a6b3a" strokeWidth="0.7" opacity="0.7" />
        {/* the writing, faint */}
        <g stroke="#7d5f30" strokeWidth="1.1" strokeLinecap="round" opacity="0.38">
          <path d="M14 22H49M14 29H44M14 36H50M14 43H40M14 50H47M14 57H36" />
        </g>
      </g>

      {/* The roll the sheet is wound on: under the top roll while folded, dropping to the sheet's end while it opens */}
      <g style={{ transform: open ? `translateY(${SHEET}px)` : 'translateY(0)' }} className={MOVE}>
        <Roll x={5} y={6} w={54} h={12} />
      </g>

      {/* The top roll */}
      <Roll x={4} y={2} w={56} h={16} />

      {/* The rope: wound round the roll and knotted in front; slips off, downward, as it opens */}
      <g
        style={{ transform: open ? 'translateY(14px)' : 'translateY(0)', opacity: open ? 0 : 1 }}
        className={`${OWN_BOX} ${MOVE}`}
        fill="none"
        strokeLinecap="round"
      >
        <path d="M20 0.8C23.5 6 23.5 14 20 19.2M44 0.8C40.5 6 40.5 14 44 19.2" stroke="#5e4220" strokeWidth="3" />
        <path d="M20 0.8C23.5 6 23.5 14 20 19.2M44 0.8C40.5 6 40.5 14 44 19.2" stroke="#b58a4c" strokeWidth="1.5" strokeDasharray="2 1.4" />
        {/* the knot and its two loose ends */}
        <circle cx="32" cy="10" r="3.4" fill="#8f6a35" stroke="#5e4220" strokeWidth="1" />
        <path d="M30.6 12.5C29 15.5 28.5 18 27 20.5M33.4 12.5C35 15.5 36 18 37.5 20" stroke="#5e4220" strokeWidth="2" />
        <path d="M30.6 12.5C29 15.5 28.5 18 27 20.5M33.4 12.5C35 15.5 36 18 37.5 20" stroke="#b58a4c" strokeWidth="0.8" />
      </g>
    </svg>
  )
}
