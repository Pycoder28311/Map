import CheckField from '../../../../components/ui/fields/CheckField'
import ColourOpacityRow from '../common/ColourOpacityRow'
import SidebarSection from '../common/SidebarSection'
import type { BorderSectionProps } from './borderRows'

/** What an area's inside starts with when a colour is picked on one that has none (the border's colour, lightly) */
const START_OPACITY = 20

/**
 * The area's inside: its colour and its opacity, always there to use (no switch). An opacity of 0 is no inside; a colour
 * picked on an area with none gives it one.
 */
export default function BorderFillSection({
  value,
  onChange,
  applyAll,
}: BorderSectionProps & { applyAll?: { checked: boolean; onChange: (on: boolean) => void } }) {
  const { fill } = value
  const colour = fill?.color ?? value.style.color
  const withColour = (color: string, commit: boolean) => onChange({ fill: { ...fill, color, opacity: fill?.opacity ?? START_OPACITY } }, commit)
  return (
    <SidebarSection id="border-fill" title="Fill">
      <ColourOpacityRow
        colour={colour}
        onColourLive={(color) => withColour(color, false)}
        onColourCommit={(color) => withColour(color, true)}
        opacity={fill?.opacity ?? 0}
        minOpacity={0}
        onOpacity={(opacity) => onChange({ fill: opacity > 0 || fill?.texture || fill?.image ? { ...fill, color: colour, opacity } : null }, true)}
      />
      {applyAll && <CheckField label="Apply to all areas" checked={applyAll.checked} onChange={applyAll.onChange} />}
    </SidebarSection>
  )
}
