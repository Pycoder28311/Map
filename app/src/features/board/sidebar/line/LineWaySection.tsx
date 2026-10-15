import RangeField from '../../../../components/ui/fields/RangeField'
import { WAY_AMOUNT } from '../../drawLine'
import { waySample } from '../../samples'
import StyleSample from '../../StyleSample'
import { DRAWING_WAYS, type Style } from '../../types'
import SidebarSection from '../common/SidebarSection'
import { ROW, pick, styleSetter, type StyleSectionProps } from './lineRows'

const WAY_LABEL: Record<Style['way'], string> = { exact: 'Exact mouse line', rounded: 'Rounded', straight: 'Straight line', corners: 'Edge corners' }

type Props = StyleSectionProps & {
  /** The pen's Shape element is picked: no way is */
  shapeActive?: boolean
  /** A way was picked (the pen then draws lines again) */
  onWayPicked?: () => void
}

/** The four drawing ways and the bar of the picked one */
export default function LineWaySection({ shapeActive = false, onWayPicked, ...props }: Props) {
  const { style } = props
  const set = styleSetter(props)
  const pickWay = (way: Style['way']) => {
    onWayPicked?.()
    set({ way, amount: way === style.way ? style.amount : WAY_AMOUNT[way] })
  }
  return (
    <SidebarSection id="line-way" title="Drawing way">
          <ul className="grid grid-cols-2 gap-1.5">
            {DRAWING_WAYS.map((way) => {
              const on = !shapeActive && style.way === way
              return (
                <li key={way}>
                  <button type="button" aria-pressed={on} aria-label={WAY_LABEL[way]} title={WAY_LABEL[way]} onClick={() => pickWay(way)} className={`${ROW} flex-col gap-0.5 ${pick(on)}`}>
                    <StyleSample object={waySample(way, style, 100, 30)} width={100} height={30} />
                    <span className="text-small text-fg-muted">{WAY_LABEL[way]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {!shapeActive && style.way === 'exact' && <RangeField label="Softness" value={style.amount} min={0} max={100} onLive={(amount) => set({ amount }, false)} onCommit={(amount) => set({ amount })} />}
          {!shapeActive && style.way === 'corners' && <RangeField label="Corner degrees" value={style.amount} min={5} max={170} suffix="°" onLive={(amount) => set({ amount }, false)} onCommit={(amount) => set({ amount })} />}
        </SidebarSection>
  )
}
