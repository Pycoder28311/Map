import FillSection from '../common/FillSection'
import SidebarSection from '../common/SidebarSection'
import type { BorderSectionProps } from './borderRows'

/** The area's inside: on or off, its colour and how see-through it is */
export default function BorderFillSection({ value, onChange }: BorderSectionProps) {
  return (
    <SidebarSection id="border-fill" title="Inside">
      <FillSection fill={value.fill} startColor={value.style.color} onChange={(fill, commit) => onChange({ fill }, commit)} />
    </SidebarSection>
  )
}
