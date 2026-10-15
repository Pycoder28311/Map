import type { ReactNode } from 'react'
import RangeField from '../../../../components/ui/fields/RangeField'
import { waySample } from '../../samples'
import StyleSample from '../../StyleSample'
import SidebarSection from '../common/SidebarSection'
import { ROW, pick, type BorderSectionProps } from './borderRows'

type Props = BorderSectionProps & {
  /** More elements after the two ways (the pen's Shape) */
  extraWays?: ReactNode
}

/** The ways to draw a border: mouse-like (with its softness bar) and linear */
export default function BorderWaySection({ value, onChange, extraWays }: Props) {
  const { style, shape } = value
  const ways = [
    { id: 'exact', label: 'Mouse-like shape', on: shape === null && style.way === 'exact', pick: () => onChange({ shape: null, style: { ...style, way: 'exact', amount: 0 } }, true) },
    { id: 'straight', label: 'Linear border', on: shape === null && style.way === 'straight', pick: () => onChange({ shape: null, style: { ...style, way: 'straight', amount: 0 } }, true) },
  ] as const
  return (
    <SidebarSection id="border-way" title="Way">
      <ul className="flex flex-col gap-1.5">
        {ways.map((way) => (
          <li key={way.id}>
            <button type="button" aria-pressed={way.on} onClick={way.pick} className={`${ROW} ${pick(way.on)}`}>
              <StyleSample object={waySample(way.id, style, 100, 30)} width={100} height={30} />
              <span className="text-body">{way.label}</span>
            </button>
            {way.on && way.id === 'exact' && (
              <div className="mt-1.5 ps-2">
                <RangeField label="Softness" value={style.amount} min={0} max={100} onLive={(amount) => onChange({ style: { ...style, amount } }, false)} onCommit={(amount) => onChange({ style: { ...style, amount } }, true)} />
              </div>
            )}
          </li>
        ))}
        {extraWays}
      </ul>
    </SidebarSection>
  )
}
