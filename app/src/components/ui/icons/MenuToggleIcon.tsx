// Full class strings so Tailwind can detect them at build time.
// Each line moves around its own centre (fill-box); same length as the sidebar's own animation
const LINE =
  '[transform-box:fill-box] origin-center transition-[translate,rotate,scale,opacity] duration-(--sidebar-duration) ease-out ' +
  'motion-reduce:transition-none'

// Open: the outer lines meet in the middle and cross into an ✕, the middle one shrinks away
const TOP = { closed: '', open: 'translate-y-[6px] rotate-45' }
const MIDDLE = { closed: '', open: 'scale-x-0 opacity-0' }
const BOTTOM = { closed: '', open: '-translate-y-[6px] -rotate-45' }

type Props = { open: boolean; className?: string }

/** ☰ that turns into an ✕ while `open` (and back, reversed). Drawn like Lucide's icons (24×24, stroke 2) */
export default function MenuToggleIcon({ open, className = '' }: Props) {
  const state = open ? 'open' : 'closed'
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
    >
      <line x1={4} y1={6} x2={20} y2={6} className={`${LINE} ${TOP[state]}`} />
      <line x1={4} y1={12} x2={20} y2={12} className={`${LINE} ${MIDDLE[state]}`} />
      <line x1={4} y1={18} x2={20} y2={18} className={`${LINE} ${BOTTOM[state]}`} />
    </svg>
  )
}
