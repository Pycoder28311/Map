import { useBoard } from '../../boardStore'
import { hasShadow } from '../../textShadow'
import { stackOf } from '../../fonts'
import SidebarSection from '../common/SidebarSection'
import { distinctStyles, fullStyle, type TextStyle } from '../../textStyles'
import { LIST_ITEM } from '../../../../components/ui/buttons/buttonStyles'

type Props = {
  mapId: string
  /** The selected text, left out of the list (none for the Text tool's own settings) */
  exclude: number | null
  /** The settings now */
  current: TextStyle
  /** Takes these settings (all of them: what the look leaves out goes back to its default) */
  apply: (style: TextStyle) => void
}

/** A line of the list, in the look it stands for */
function Sample({ style, text }: { style: TextStyle; text: string }) {
  const s = fullStyle(style)
  const stroke = s.strokeWidth > 0
  const shadow = hasShadow(s)
  return (
    <span
      className="min-w-0 flex-1 truncate text-fg"
      style={{
        fontFamily: stackOf(s.font),
        fontWeight: s.weight,
        fontStyle: s.italic ? (s.oblique ? 'oblique' : 'italic') : 'normal',
        // The size shows its proportion, within what fits a row
        fontSize: Math.min(26, Math.max(13, s.size * 0.6)),
        opacity: s.opacity / 100,
        textDecoration: [s.underline && 'underline', s.strike && 'line-through'].filter(Boolean).join(' ') || undefined,
        WebkitTextStroke: stroke ? `${Math.min(2, s.strokeWidth / 4)}px ${s.strokeColor}` : undefined,
        textShadow: shadow ? `${Math.max(-3, Math.min(3, s.shadowDistance))}px ${Math.max(-3, Math.min(3, s.shadowY))}px ${Math.min(4, s.shadowBlur)}px ${s.shadowColor}` : undefined,
        letterSpacing: s.spacing ? `${Math.min(6, s.spacing)}px` : undefined,
        outline: s.boxed ? `1px solid ${s.boxColor ?? s.color}` : undefined,
        outlineOffset: 2,
      }}
    >
      {text.trim().split('\n')[0] || 'Text'}
    </span>
  )
}

/**
 * The looks of the map's other texts, most used first: a click takes that look (colours, size, font…, not the words or the
 * place).
 */
export default function TextStylesSection({ mapId, exclude, current, apply }: Props) {
  const board = useBoard(mapId)
  const entries = distinctStyles(board, exclude, current)
  return (
    <SidebarSection id="looks" title="Make style identical to:" fixed>
      {entries.length === 0 ? (
        <p className="text-small text-fg-subtle">No other text with a different look yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {entries.map((e) => (
            <li key={JSON.stringify(e.style)}>
              <button
                type="button"
                onClick={() => apply(e.style)}
                title="Use this look"
                className={LIST_ITEM}
              >
                <Sample style={e.style} text={e.sample} />
                {e.count > 1 && <span className="shrink-0 text-small tabular-nums text-fg-subtle">×{e.count}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SidebarSection>
  )
}
