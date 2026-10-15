import { useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import CheckField from '../../../../components/ui/fields/CheckField'
import RangeField from '../../../../components/ui/fields/RangeField'
import { ARROW_HEADS, ARROW_LABEL, defaultArrowSize } from '../../arrows'
import { armSample, headSample } from '../../samples'
import StyleSample from '../../StyleSample'
import type { Style } from '../../types'
import SidebarSection, { openSection } from '../common/SidebarSection'
import { ROW, pick, styleSetter, type StyleSectionProps } from './lineRows'

/** The arrow at the start and at the end of a line, its head and its size */
export default function LineArrowsSection(props: StyleSectionProps) {
  const { style } = props
  const [headsOpen, setHeadsOpen] = useState(false)
  const set = styleSetter(props)
  const setArrow = (patch: Partial<Style['arrow']>, commit = true) => set({ arrow: { ...style.arrow, ...patch } }, commit)
  const hasArrow = style.arrow.start || style.arrow.end
  const toggleArrows = (on: boolean) => setArrow(on ? { end: true, size: style.arrow.size || defaultArrowSize(style.thickness) } : { start: false, end: false })
  const switchArrows = (on: boolean) => {
    toggleArrows(on)
    if (on) openSection('line-arrows')
  }
  return (
    <SidebarSection id="line-arrows" title="Arrows" leading={<CheckField label="" aria-label="Arrow on the line" checked={hasArrow} onChange={switchArrows} />}>
        {hasArrow && (
          <>
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`${ROW} justify-between gap-1 ${pick(style.arrow.start)}`}>
              <StyleSample object={armSample('start', style, 80, 30)} width={80} height={30} />
              <CheckField label="" aria-label="Arrow at the start" checked={style.arrow.start} onChange={(start) => setArrow({ start })} />
            </div>
            <div className={`${ROW} justify-between gap-1 ${pick(style.arrow.end)}`}>
              <CheckField label="" aria-label="Arrow at the end" checked={style.arrow.end} onChange={(end) => setArrow({ end })} />
              <StyleSample object={armSample('end', style, 80, 30)} width={80} height={30} />
            </div>
          </div>
          <button type="button" aria-expanded={headsOpen} aria-label="Arrow style" onClick={() => setHeadsOpen((o) => !o)} className={`${ROW} justify-between ${pick(false)}`}>
            <StyleSample object={headSample(style.arrow.style, style, 70, 28)} width={70} height={28} />
            <span className="text-small text-fg-muted">{ARROW_LABEL[ARROW_HEADS[style.arrow.style] ?? 'open']}</span>
            <LuChevronDown className={`size-4 transition-transform ${headsOpen ? 'rotate-180' : ''}`} />
          </button>
          {headsOpen && (
            <ul className="grid grid-cols-3 gap-1.5">
              {ARROW_HEADS.map((head, i) => (
                <li key={head}>
                  <button type="button" aria-pressed={style.arrow.style === i} aria-label={ARROW_LABEL[head]} title={ARROW_LABEL[head]} onClick={() => setArrow({ style: i })} className={`${ROW} justify-center ${pick(style.arrow.style === i)}`}>
                    <StyleSample object={headSample(i, style, 60, 28)} width={60} height={28} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <RangeField label="Arrow size" value={style.arrow.size} min={4} max={80} onLive={(size) => setArrow({ size }, false)} onCommit={(size) => setArrow({ size })} />
          </>
        )}
      </SidebarSection>
  )
}
