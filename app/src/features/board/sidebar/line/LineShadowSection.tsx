import CheckField from '../../../../components/ui/fields/CheckField'
import ColourField from '../../../../components/ui/fields/ColourField'
import { NumberField } from '../../NumberBox'
import CaptionedRow from '../common/CaptionedRow'
import SidebarSection, { openSection } from '../common/SidebarSection'
import { styleSetter, type StyleSectionProps } from './lineRows'

const NONE = { color: '#000000', blur: 0, distance: 0 }
/** What a shadow gets when it is switched on */
const STARTS_AS = { blur: 4, distance: 3 }

/** A shadow under the line or the shape: its colour, how soft it is and how far it falls (blur and distance 0: none) */
export default function LineShadowSection(props: StyleSectionProps) {
  const set = styleSetter(props)
  const shadow = props.style.shadow ?? NONE
  const change = (patch: Partial<typeof NONE>, commit = true) => {
    const next = { ...shadow, ...patch }
    set({ shadow: next.blur > 0 || next.distance > 0 ? next : undefined }, commit)
  }
  return (
    <SidebarSection
      id="line-shadow"
      title="Shadow"
      leading={
        <CheckField
          label=""
          aria-label="Shadow"
          checked={shadow.blur > 0 || shadow.distance > 0}
          onChange={(on) => {
            change(on ? STARTS_AS : { blur: 0, distance: 0 })
            if (on) openSection('line-shadow')
          }}
        />
      }
    >
      <CaptionedRow
        fields={[
          { label: 'Colour', node: <ColourField wide label="Shadow colour" value={shadow.color} onLive={(color) => change({ color }, false)} onCommit={(color) => change({ color })} /> },
          { label: 'Blur', node: <NumberField hideLabel label="Blur" value={shadow.blur} min={0} max={40} onCommit={(blur) => change({ blur })} /> },
          { label: 'Distance', node: <NumberField hideLabel label="Distance" value={shadow.distance} min={0} max={40} onCommit={(distance) => change({ distance })} /> },
        ]}
      />
    </SidebarSection>
  )
}
