import { useId, useMemo } from 'react'
import { seededRandom } from '../../lib/seededRandom'

// The profile page's banner: a dark fantasy night drawn in SVG (no picture to load, sharp at any width). A blood-red horizon, a pale moon
// behind thin clouds, ridges fading into mist, a ruined spired keep on a crag with a few lit windows, dead trees in the foreground and
// bats. Everything random comes from seededRandom, so it is the same picture every time. The mist drifts slowly (not with reduced motion).

const W = 1600
const H = 400

/** A jagged ridge across the whole width, closed along the bottom */
function ridge(seed: string, base: number, amp: number, step: number) {
  const rnd = seededRandom(seed)
  let d = `M0 ${H} L0 ${base}`
  let y = base
  for (let x = 0; x <= W + step; x += step) {
    // a slow wave for the big shapes, a random walk for the jagged edge, pulled back towards the base
    y += (rnd() - 0.5) * amp - (y - base) * 0.25
    const wave = Math.sin(x / 210 + base) * amp * 0.6
    d += ` L${x.toFixed(0)} ${(y + wave).toFixed(1)}`
  }
  return `${d} L${W} ${H} Z`
}

/** A bare, twisted tree: line segments, thinner at each fork */
function deadTree(seed: string, x: number, y: number, height: number, lean: number) {
  const rnd = seededRandom(seed)
  const parts: { d: string; w: number }[] = []
  const grow = (x0: number, y0: number, angle: number, len: number, width: number, depth: number) => {
    const bend = angle + (rnd() - 0.5) * 0.5
    const x1 = x0 + Math.sin(bend) * len
    const y1 = y0 - Math.cos(bend) * len
    const cx = x0 + Math.sin(angle) * len * 0.5 + (rnd() - 0.5) * len * 0.3
    const cy = y0 - Math.cos(angle) * len * 0.5
    parts.push({ d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, w: width })
    if (depth === 0) return
    const forks = depth > 3 ? 2 : 2 + Math.round(rnd())
    for (let i = 0; i < forks; i++) {
      const spread = (i / (forks - 1 || 1) - 0.5) * 1.3 + (rnd() - 0.5) * 0.4
      grow(x1, y1, bend + spread, len * (0.62 + rnd() * 0.18), width * 0.62, depth - 1)
    }
  }
  grow(x, y, lean, height * 0.38, height * 0.06, 5)
  return parts
}

/** Stars, denser and brighter high up */
function stars(seed: string, count: number) {
  const rnd = seededRandom(seed)
  return Array.from({ length: count }, () => {
    const y = Math.pow(rnd(), 1.6) * H * 0.62
    return { x: rnd() * W, y, r: 0.4 + rnd() * 1.1, o: 0.25 + rnd() * 0.65 * (1 - y / H) }
  })
}

// The keep on the crag: walls, towers and spires as one shape (overlaps are fine, it is one colour)
const CASTLE = [
  // the crag it stands on
  'M250 400 L300 338 L332 318 L360 290 L388 272 L404 258 L540 256 L560 270 L584 296 L612 322 L650 352 L700 400 Z',
  // curtain wall with battlements
  'M398 260 L398 226 L406 226 L406 220 L414 220 L414 226 L424 226 L424 220 L432 220 L432 226 L510 226 L510 220 L518 220 L518 226 L528 226 L528 220 L536 220 L536 226 L544 226 L544 260 Z',
  // left tower and its spire
  'M404 260 L404 196 L400 196 L416 150 L432 196 L428 196 L428 260 Z',
  // the keep and its broad roof
  'M444 260 L444 168 L438 168 L470 112 L502 168 L496 168 L496 260 Z',
  // the tall needle spire with a pennant
  'M478 170 L478 98 L475 98 L483 46 L491 98 L488 98 L488 170 Z',
  'M483 46 L483 30 L499 35 L483 40 Z',
  // right tower, half fallen
  'M516 260 L516 204 L520 198 L524 204 L528 192 L534 204 L538 200 L538 260 Z',
]

const WINDOWS = [
  { x: 413, y: 208, w: 5, h: 9 },
  { x: 462, y: 186, w: 6, h: 11 },
  { x: 474, y: 214, w: 5, h: 9 },
  { x: 481, y: 124, w: 4, h: 8 },
  { x: 524, y: 224, w: 4, h: 7 },
]

const BATS = [
  { x: 1040, y: 96, s: 1 },
  { x: 1092, y: 72, s: 0.7 },
  { x: 1268, y: 118, s: 0.85 },
  { x: 1006, y: 140, s: 0.6 },
]

export default function ProfileBanner({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const shapes = useMemo(
    () => ({
      far: ridge('far', 238, 22, 26),
      mid: ridge('mid', 286, 34, 34),
      near: ridge('near', 342, 18, 40),
      stars: stars('profile-stars', 140),
      trees: [
        deadTree('tree-left', 150, 372, 210, -0.12),
        deadTree('tree-right', 1480, 380, 170, 0.18),
        deadTree('tree-small', 1330, 388, 90, 0.05),
      ],
    }),
    [],
  )
  const ref = (name: string) => `url(#${id}-${name})`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A ruined castle on a crag under a pale moon"
      className={`block size-full ${className}`}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040309" />
          <stop offset="0.38" stopColor="#120b1c" />
          <stop offset="0.6" stopColor="#2e1022" />
          <stop offset="0.78" stopColor="#5e1a25" />
          <stop offset="0.92" stopColor="#7a2a26" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="1050" cy="150" r="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3d9c4" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="#b8444f" stopOpacity="0.12" />
          <stop offset="1" stopColor="#b8444f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-moon`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#fbf1e2" />
          <stop offset="0.7" stopColor="#e6d3bd" />
          <stop offset="1" stopColor="#c9a993" />
        </radialGradient>
        <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4a63" stopOpacity="0" />
          <stop offset="0.5" stopColor="#6b4a63" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6b4a63" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-fog`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.55  0 0 0 0.9 -0.32" />
        </filter>
        <filter id={`${id}-ember`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient
          id={`${id}-horizon`}
          cx="580"
          cy="250"
          r="520"
          gradientTransform="matrix(1 0 0 0.35 0 162)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#d2513a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#d2513a" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Sky, the moon's glow, stars */}
      <rect width={W} height={H} fill={ref('sky')} />
      <rect width={W} height={H} fill={ref('glow')} />
      <rect width={W} height={H} fill={ref('horizon')} />
      <g fill="#efe6ff">
        {shapes.stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>

      {/* The moon, its darker seas, and thin clouds across it (moved in from the right, so a narrow screen still shows it) */}
      <g transform="translate(-130 0)">
        <circle cx="1180" cy="150" r="66" fill={ref('moon')} />
        <g fill="#b89784" opacity="0.35">
          <circle cx="1160" cy="134" r="14" />
          <circle cx="1198" cy="168" r="10" />
          <circle cx="1206" cy="128" r="6" />
          <circle cx="1166" cy="176" r="5" />
        </g>
        <g fill="#1a0e1a" opacity="0.55" filter={ref('soft')}>
          <ellipse cx="1110" cy="182" rx="170" ry="6" />
          <ellipse cx="1260" cy="200" rx="130" ry="5" />
          <ellipse cx="1220" cy="122" rx="80" ry="3" />
        </g>
      </g>

      {/* Bats near the moon */}
      <g fill="#07050a" transform="translate(-130 0)">
        {BATS.map((b, i) => (
          <path
            key={i}
            transform={`translate(${b.x} ${b.y}) scale(${b.s})`}
            d="M0 0 C-4 -6 -10 -7 -16 -4 C-12 -3 -11 0 -12 3 C-9 1 -6 2 -4 5 C-3 3 -1 2 0 3 C1 2 3 3 4 5 C6 2 9 1 12 3 C11 0 12 -3 16 -4 C10 -7 4 -6 0 0 Z"
          />
        ))}
      </g>

      {/* Ridges, far to near, each with mist above it */}
      <path d={shapes.far} fill="#33192a" />
      <rect y="200" width={W} height="90" fill={ref('mist')} />
      <path d={shapes.mid} fill="#170d1a" />
      <g className="motion-safe:animate-profile-mist">
        <rect x="0" y="230" width={W * 2} height="110" filter={ref('fog')} opacity="0.55" />
      </g>

      {/* The keep on its crag, a few windows still lit (moved in from the left, like the moon) */}
      <g transform="translate(110 0)">
        <g fill="#0b070e">
          {CASTLE.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g fill="#ffa552" filter={ref('ember')}>
          {WINDOWS.map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} />
          ))}
        </g>
      </g>

      {/* Foreground hills and dead trees */}
      <path d={shapes.near} fill="#07050a" />
      <g stroke="#07050a" strokeLinecap="round" fill="none">
        {shapes.trees.flat().map((p, i) => (
          <path key={i} d={p.d} strokeWidth={p.w} />
        ))}
      </g>
    </svg>
  )
}
