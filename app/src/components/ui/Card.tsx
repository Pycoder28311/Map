import type { HTMLAttributes } from 'react'

// Full class strings so Tailwind can detect them at build time.
const VARIANTS = {
  gray: 'bg-fill-strong',
  muted: 'bg-fill',
  white: 'bg-surface shadow-lg',
} as const

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof VARIANTS
  /** Overrides --card-radius for this card only (px) */
  radius?: number
}

// `className` is for size, spacing and layout; the look comes from `variant`.
export default function Card({ variant = 'gray', radius, className = '', style, children, ...props }: Props) {
  return (
    <div
      {...props}
      className={`rounded-(--card-radius) ${VARIANTS[variant]} ${className}`}
      style={radius === undefined ? style : { ...style, borderRadius: radius }}
    >
      {children}
    </div>
  )
}
