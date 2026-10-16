import ValueBar from '../../../../components/ui/fields/ValueBar'
import { typeSample } from '../../samples'
import { softnessOf } from '../../style'
import StyleSample from '../../StyleSample'
import { LINE_TYPES, type Style } from '../../types'
import SidebarSection from '../common/SidebarSection'
import OptionRowPicker from '../common/OptionRowPicker'
import { styleSetter, type StyleSectionProps } from './lineRows'

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
      <OptionRowPicker
        label="Line type"
        value={style.type}
        onChange={pickType}
        options={LINE_TYPES.map((type) => ({
          value: type,
          label: TYPE_LABEL[type],
          sample: (w) => <StyleSample object={typeSample({ ...style, type, ...(style.type === type ? {} : TYPE_DEFAULT[type]) }, w, 28)} width={w} height={28} />,
        }))}
      />
      <ValueBar
        label="Softness"
        value={softnessOf(style)}
        min={0}
        max={100}
        defaultValue={50}
        presets={[0, 20, 40, 60, 80, 100]}
        grid={{ rows: 2, columns: 3 }}
        onLive={(v) => setSoftness(v, false)}
        onCommit={(v) => setSoftness(v, true)}
      />
      {style.type !== 'solid' && (
        <div className="flex flex-col gap-1.5">
          <ValueBar
            label="Gap size"
            value={style.gap}
            min={1}
            max={60}
            defaultValue={TYPE_DEFAULT[style.type].gap || 8}
            presets={[2, 4, 8, 12, 20, 40]}
            grid={{ rows: 2, columns: 3 }}
            onLive={(gap) => set({ gap }, false)}
            onCommit={(gap) => set({ gap })}
          />
          {style.type !== 'double' && (
            <ValueBar
              label="Parts size"
              value={style.part}
              min={1}
              max={60}
              defaultValue={TYPE_DEFAULT[style.type].part || 8}
              presets={[4, 6, 8, 12, 20, 40]}
              grid={{ rows: 2, columns: 3 }}
              onLive={(part) => set({ part }, false)}
              onCommit={(part) => set({ part })}
            />
          )}
        </div>
      )}
    </SidebarSection>
  )
}
