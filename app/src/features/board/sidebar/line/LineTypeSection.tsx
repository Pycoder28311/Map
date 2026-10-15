import RangeField from '../../../../components/ui/fields/RangeField'
import { typeSample } from '../../samples'
import { softnessOf } from '../../style'
import StyleSample from '../../StyleSample'
import { LINE_TYPES, type Style } from '../../types'
import SidebarSection from '../common/SidebarSection'
import { ROW, pick, styleSetter, type StyleSectionProps } from './lineRows'

const TYPE_LABEL: Record<Style['type'], string> = { solid: 'Continuous line', dashed: 'Distinguished line', double: 'Two parallel lines', diagonal: 'Diagonal distinguished' }
/** What gap and part start at when a type is picked and has none */
const TYPE_DEFAULT: Record<Style['type'], { gap: number; part: number }> = { solid: { gap: 0, part: 0 }, dashed: { gap: 8, part: 12 }, double: { gap: 6, part: 0 }, diagonal: { gap: 8, part: 6 } }

/** The four types (all visible, a sub-bar under the picked one) */
export default function LineTypeSection(props: StyleSectionProps) {
  const { style } = props
  const set = styleSetter(props)
  // Softness is the path's own now; the exact way's old `amount` (its softness before) is folded into it, so there is one number
  const setSoftness = (softness: number, commit: boolean) => set({ softness: softness > 0 ? softness : undefined, ...(style.way === 'exact' ? { amount: 0 } : {}) }, commit)
  const pickType = (type: Style['type']) => {
    const d = TYPE_DEFAULT[type]
    set({ type, gap: style.gap || d.gap, part: style.part || d.part })
  }
  return (
    <SidebarSection id="line-type" title="Type">
      <ul className="grid grid-cols-2 gap-1.5">
        {LINE_TYPES.map((type) => (
          <li key={type}>
            <button type="button" aria-pressed={style.type === type} aria-label={TYPE_LABEL[type]} title={TYPE_LABEL[type]} onClick={() => pickType(type)} className={`${ROW} h-full flex-col gap-0.5 ${pick(style.type === type)}`}>
              <StyleSample object={typeSample({ ...style, type, ...(style.type === type ? {} : TYPE_DEFAULT[type]) }, 100, 30)} width={100} height={30} />
              <span className="text-small text-fg-muted">{TYPE_LABEL[type]}</span>
            </button>
          </li>
        ))}
      </ul>
      <RangeField label="Softness" value={softnessOf(style)} min={0} max={100} onLive={(v) => setSoftness(v, false)} onCommit={(v) => setSoftness(v, true)} />
      {style.type !== 'solid' && (
        <div className="flex flex-col gap-1.5">
          <RangeField label="Gap size" value={style.gap} min={1} max={60} onLive={(gap) => set({ gap }, false)} onCommit={(gap) => set({ gap })} />
          {style.type !== 'double' && <RangeField label="Parts size" value={style.part} min={1} max={60} onLive={(part) => set({ part }, false)} onCommit={(part) => set({ part })} />}
        </div>
      )}
    </SidebarSection>
  )
}
