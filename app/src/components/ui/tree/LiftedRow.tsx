import { useEffect, useRef } from 'react'
import type { ButtonIcon } from '../icons/IconSlot'
import { css, EASING, MOTION, reducedMotion, TIMING } from './dragEffects'
import { ICON_BOX } from './treeIconStyles'

/**
 * A tree row while it's being dragged (the DragOverlay's content): the Zen reel's lifted row. It
 * leaves the ground with a little overshoot: grows, tilts and drifts right (the overlay's position
 * already includes the drift, so it starts from the column), with a shadow under it.
 */
export default function LiftedRow({ label, icon: Icon }: { label: string; icon?: ButtonIcon }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion()) return
    ref.current?.animate(
      [
        { transform: `translateX(${-MOTION.dragNudge}px) scale(1) rotate(0deg)` },
        { transform: `translateX(0) scale(${MOTION.liftScale}) rotate(${MOTION.liftTilt}deg)` },
      ],
      { duration: TIMING.lift, easing: css(EASING.lift), fill: 'forwards' },
    )
  }, [])

  return (
    <div
      ref={ref}
      data-lifted-row
      style={{ opacity: MOTION.dragAlpha }}
      className="flex h-full w-full cursor-grabbing items-center gap-(--tree-label-gap) rounded-(--btn-radius) bg-row-drag py-(--pill-py) ps-(--btn-px) pe-(--pill-px) text-body text-fg shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
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
