import type { CSSProperties, ReactNode } from 'react'

// Full class strings so Tailwind can detect them at build time.
/**
 * Where the popout (ears included) sits under its trigger. start / end keep it within the trigger's
 * edge, so a trigger at the end of the bar never pushes it past the window.
 */
const ALIGN = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
} as const

// Material 3 "emphasized decelerate": fast out of the edge, soft landing (no overshoot, which
// would open a gap between the bar and the popout)
const EASE = 'ease-[cubic-bezier(0.05,0.7,0.1,1)]'

// Hidden: invisible (no hover, no focus) and slid up under the bar's edge. Shown while the trigger
// or the popout is hovered or holds keyboard focus. Closing waits a moment, so crossing the pointer
// from the trigger to the popout never flickers.
const SHOWN = 'group-hover/popout:visible group-focus-within/popout:visible'
const SLID_IN = 'group-hover/popout:translate-y-0 group-focus-within/popout:translate-y-0'
const NO_DELAY = 'group-hover/popout:delay-0 group-focus-within/popout:delay-0'
const TIMING = `duration-(--popout-duration) ${EASE} delay-150 ${NO_DELAY} motion-reduce:duration-0`

/** The concave corners joining the popout to the bar: the bar's colour with a quarter circle cut out */
const ear = (side: 'left' | 'right'): CSSProperties => ({
  background: `radial-gradient(circle at ${side === 'left' ? '0' : '100%'} 100%, transparent calc(var(--popout-radius) - 0.5px), var(--surface) var(--popout-radius))`,
})

type Props = {
  /** The bar's element that opens it on hover, e.g. a <Button> */
  trigger: ReactNode
  /** What grows out of the bar */
  children: ReactNode
  align?: keyof typeof ALIGN
  /** Placement in the bar, e.g. ml-auto to push it to the end */
  className?: string
}

/**
 * A rounded panel that grows out of a bar's bottom edge while its trigger is hovered (Hyprland /
 * Caelestia style): same colour as the bar, joined to it by concave corners, so the bar itself
 * seems to stretch. Put it directly in a bar that is a flex row (e.g. Navbar): it stretches to the
 * bar's height, so the popout starts exactly at the bar's edge.
 *
 *   <BarPopout trigger={<Button variant="ghost" icon={LuBell}>Updates</Button>}>
 *     <p>No new updates</p>
 *   </BarPopout>
 */
export default function BarPopout({ trigger, children, align = 'center', className = '' }: Props) {
  return (
    <div className={`group/popout relative flex items-center self-stretch ${className}`}>
      {trigger}

      {/* Clips the popout at the bar's edge while it slides; px: room for the ears */}
      <div
        className={`invisible absolute top-full z-30 overflow-hidden px-(--popout-radius) transition-[visibility] ${SHOWN} ${TIMING} ${ALIGN[align]}`}
      >
        <div
          className={`relative -translate-y-full rounded-b-(--popout-radius) bg-surface p-(--popout-p) transition-transform ${SLID_IN} ${TIMING}`}
        >
          <span aria-hidden style={ear('left')} className="absolute top-0 right-full size-(--popout-radius)" />
          <span aria-hidden style={ear('right')} className="absolute top-0 left-full size-(--popout-radius)" />
          {children}
        </div>
      </div>
    </div>
  )
}
