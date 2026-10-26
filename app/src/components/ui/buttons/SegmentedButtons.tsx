import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import Button from './Button'
import type { ButtonSize } from './buttonStyles'
import type { ButtonIcon } from '../icons/IconSlot'

export type SegmentOption<T extends string> = { value: T; label: string; icon?: ButtonIcon }

type Props<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** The group's name, for screen readers */
  label: string
  size?: ButtonSize
  className?: string
}

/**
 * Connected buttons, one of them chosen (the kind of thing to make): one dark bar, and a lighter block behind the chosen one that
 * slides to the one you pick (styles/buttons.css, .ui-seg). The buttons are Shade buttons without brackets.
 */
export default function SegmentedButtons<T extends string>({ options, value, onChange, label, size, className = '' }: Props<T>) {
  const barRef = useRef<HTMLDivElement>(null)
  // Where the chosen button is in the bar (measured); the block moves there. No slide for the first placement
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const measure = () => {
      const chosen = bar.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (chosen) setThumb({ left: chosen.offsetLeft, width: chosen.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [value, options.length])

  // After the first placement is painted, moves slide
  useLayoutEffect(() => {
    if (thumb && !ready) {
      const frame = requestAnimationFrame(() => setReady(true))
      return () => cancelAnimationFrame(frame)
    }
  }, [thumb, ready])

  const style: CSSProperties | undefined = thumb ? { width: thumb.width, transform: `translateX(${thumb.left}px)` } : undefined

  return (
    <div ref={barRef} role="group" aria-label={label} data-ready={ready} className={`ui-seg ${className}`}>
      <span aria-hidden style={style} className={`ui-seg-thumb ${thumb ? '' : 'invisible'}`} />
      {options.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          plain
          size={size}
          icon={option.icon}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
