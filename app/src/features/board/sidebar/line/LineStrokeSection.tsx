import ColourField from '../../../../components/ui/fields/ColourField'
import { NumberField } from '../../NumberBox'
import CaptionedRow from '../common/CaptionedRow'
import SidebarSection from '../common/SidebarSection'
import { styleSetter, type StyleSectionProps } from './lineRows'

const NONE = { color: '#000000', width: 0, opacity: 100 }
/** The width a stroke gets when it is switched on */
const STARTS_AT = 2

/** An outline round the line or the shape's border: its colour, how far it reaches out (0: none) and its opacity */
export default function LineStrokeSection(props: StyleSectionProps) {
  const set = styleSetter(props)
  const stroke = props.style.stroke ?? NONE
  const change = (patch: Partial<typeof NONE>, commit = true) => {
    const next = { ...stroke, ...patch }
    set({ stroke: next.width > 0 ? next : undefined }, commit)
  }
  return (
    <SidebarSection
      id="line-stroke"
      title="Stroke"
      check={{
        checked: stroke.width > 0,
        label: 'Stroke',
        onChange: (on) => change({ width: on ? STARTS_AT : 0 }),
      }}
    >
      <CaptionedRow
        fields={[
          { label: 'Colour', node: <ColourField wide label="Stroke colour" value={stroke.color} onLive={(color) => change({ color }, false)} onCommit={(color) => change({ color })} /> },
          { label: 'Intensity', node: <NumberField hideLabel label="Intensity" value={stroke.width} min={0} max={20} onCommit={(width) => change({ width })} /> },
          { label: 'Opacity', node: <NumberField hideLabel label="Opacity" suffix="%" value={stroke.opacity} min={1} max={100} onCommit={(opacity) => change({ opacity })} /> },
        ]}
      />
    </SidebarSection>
  )
}
