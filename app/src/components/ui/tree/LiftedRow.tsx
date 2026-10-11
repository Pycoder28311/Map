import { useEffect, useRef } from 'react'
import type { ButtonIcon } from '../icons/IconSlot'
import { css, EASING, MOTION, reducedMotion, TIMING } from './dragEffects'
import { ICON_BOX } from './treeIconStyles'

type Props = {
  label: string
  icon?: ButtonIcon
  /** Where it was grabbed (fractions of its box): it grows and tilts around that point, so the pointer stays on it */
  origin?: { fx: number; fy: number }
  /** Its width (default: its container's) */
  className?: string
}

/**
 * A tree row while it's being dragged (the floating copy's look over the sidebar): the Zen reel's
 * lifted row. It leaves the ground with a little overshoot: grows and tilts around the grab point,
 * with a shadow under it.
 */
export default function LiftedRow({ label, icon: Icon, origin, className = 'w-full' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion()) return
    ref.current?.animate(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: `scale(${MOTION.liftScale}) rotate(${MOTION.liftTilt}deg)` },
      ],
      { duration: TIMING.lift, easing: css(EASING.lift), fill: 'forwards' },
    )
  }, [])

  return (
    <div
      ref={ref}
      data-lifted-row
      style={{ opacity: MOTION.dragAlpha, transformOrigin: origin ? `${origin.fx * 100}% ${origin.fy * 100}%` : undefined }}
      className={`${className} flex cursor-grabbing items-center gap-(--tree-label-gap) rounded-(--btn-radius) bg-row-drag py-(--pill-py) ps-(--btn-px) pe-(--pill-px) text-body text-fg shadow-[0_6px_18px_rgba(0,0,0,0.35)]`}
    >
      {Icon && (
        <span className={ICON_BOX}>
          <Icon className="size-(--btn-icon-size)" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  )
}
