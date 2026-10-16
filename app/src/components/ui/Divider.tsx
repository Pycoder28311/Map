import { Link } from 'react-router-dom'
import { ICON_EFFECT_GROUP, iconEffectClass } from './icons/iconEffects'
import type { PlainIcon } from './icons/IconSlot'
import { ICON_BOX, ICON_BUTTON } from './tree/treeIconStyles'

// Full class strings so Tailwind can detect them at build time.
const FADE = 'transition-opacity duration-(--sidebar-duration) ease-out motion-reduce:transition-none'
// Compact: as wide as a compact tree row (its icon's box + the row padding), so it lines up with the icons
const RAIL_LINE_W = 'w-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'

type Props = {
  /** Text before the line, e.g. "Projects"; none: just the line */
  label?: string
  /** The label is a link to this page (e.g. the Notes page) */
  labelTo?: string
  /** A small button at the right end, e.g. "New note" */
  action?: { icon: PlainIcon; label: string; onClick: () => void; disabled?: boolean }
  /** Icons-only sidebar: only a short line shows; the height stays, so nothing below moves */
  compact?: boolean
  className?: string
}

/**
 * The line between two parts of a list (e.g. the sidebar's sections): [label] ──── [button], both
 * optional. Always --divider-h tall, with or without a label, open or compact.
 *
 *   <Divider label="Notes" action={{ icon: LuPlus, label: 'New note', onClick }} />
 */
export default function Divider({ label, labelTo, action, compact = false, className = '' }: Props) {
  const hidden = compact ? 'pointer-events-none opacity-0' : ''
  return (
    <div role="separator" aria-label={label} className={`relative flex h-(--divider-h) shrink-0 items-center gap-1 px-(--btn-px) ${className}`}>
      {label &&
        (labelTo ? (
          <Link
            to={labelTo}
            tabIndex={compact ? -1 : undefined}
            className={`shrink-0 rounded-(--corner-sm) text-small font-medium text-fg-muted hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent ${FADE} ${hidden}`}
          >
            {label}
          </Link>
        ) : (
          <span className={`shrink-0 text-small font-medium text-fg-muted ${FADE} ${hidden}`}>{label}</span>
        ))}
      <span aria-hidden className={`h-px flex-1 bg-(--divider-line) ${FADE} ${hidden}`} />
      {/* At the row's right edge, in line with the rows' own right icons */}
      {action && (
        <button
          type="button"
          aria-label={action.label}
          title={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
          tabIndex={compact ? -1 : undefined}
          className={`${ICON_EFFECT_GROUP} ${ICON_BOX} ${ICON_BUTTON} hover-faint disabled:opacity-40 ${FADE} ${hidden}`}
        >
          <action.icon className={`size-(--btn-icon-size) ${iconEffectClass()}`} />
        </button>
      )}
      {/* Compact: the short line in the rail */}
      <span
        aria-hidden
        className={`absolute start-0 top-1/2 h-px ${RAIL_LINE_W} bg-(--divider-line) ${FADE} ${compact ? '' : 'opacity-0'}`}
      />
    </div>
  )
}
