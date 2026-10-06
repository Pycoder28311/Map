const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'absolute inset-0 size-full',
} as const

// Layered icon: the tray stays still, the arrow is its own element so it can be
// animated with a transform on the compositor (no repaint, off the main thread).
export default function DownloadIcon({ className = '', movingClassName = '' }: { className?: string; movingClassName?: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-block ${className}`}>
      <svg {...svgProps}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      </svg>
      <span className={`absolute inset-0 ${movingClassName}`}>
        <svg {...svgProps}>
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      </span>
    </span>
  )
}

DownloadIcon.layered = true as const
