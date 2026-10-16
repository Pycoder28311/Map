import ValueBar from '../../../../components/ui/fields/ValueBar'
import { ARROW_HEADS, ARROW_LABEL, defaultArrowSize } from '../../arrows'
import { armSample, headSample } from '../../samples'
import StyleSample from '../../StyleSample'
import type { Style } from '../../types'
import OptionRowPicker from '../common/OptionRowPicker'
import SidebarSection from '../common/SidebarSection'
import { ROW, pick, styleSetter, type StyleSectionProps } from './lineRows'

/** The arrow at the start and at the end of a line (two tiles to switch on), its head (one row with the others in a dropdown, like Type) and its size */
export default function LineArrowsSection(props: StyleSectionProps) {
  const { style } = props
  const set = styleSetter(props)
  const setArrow = (patch: Partial<Style['arrow']>, commit = true) => set({ arrow: { ...style.arrow, ...patch } }, commit)
  const hasArrow = style.arrow.start || style.arrow.end
  const toggleArrows = (on: boolean) => setArrow(on ? { end: true, size: style.arrow.size || defaultArrowSize(style.thickness) } : { start: false, end: false })
  const ends = [
    { side: 'start', label: 'Start' },
    { side: 'end', label: 'End' },
  ] as const
  return (
    <SidebarSection id="line-arrows" title="Arrows" check={{ checked: hasArrow, onChange: toggleArrows, label: 'Arrow on the line' }}>
      <ul className="grid grid-cols-2 gap-1.5">
        {ends.map(({ side, label }) => (
          <li key={side}>
            <button
              type="button"
              aria-pressed={style.arrow[side]}
              aria-label={`Arrow at the ${side}`}
              onClick={() => setArrow({ [side]: !style.arrow[side] })}
              className={`${ROW} h-full flex-col gap-0.5 ${pick(style.arrow[side])}`}
            >
              <StyleSample object={armSample(side, style, 100, 30)} width={100} height={30} />
              <span className="text-small text-fg-muted">{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <OptionRowPicker
        label="Arrow head"
        value={style.arrow.style}
        onChange={(i) => setArrow({ style: i })}
        options={ARROW_HEADS.map((head, i) => ({
          value: i,
          label: ARROW_LABEL[head],
          sample: (w) => <StyleSample object={headSample(i, style, w, 28)} width={w} height={28} />,
        }))}
      />
      <ValueBar
        label="Arrow size"
        value={style.arrow.size}
        min={4}
        max={80}
        defaultValue={defaultArrowSize(style.thickness)}
        presets={[8, 12, 16, 24, 32, 48]}
        grid={{ rows: 2, columns: 3 }}
        onLive={(size) => setArrow({ size }, false)}
        onCommit={(size) => setArrow({ size })}
      />
    </SidebarSection>
  )
}
