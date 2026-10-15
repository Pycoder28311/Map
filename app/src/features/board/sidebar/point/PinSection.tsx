import type { ReactNode } from 'react'
import PinPicker from '../../PinPicker'
import type { PinIcon } from '../../types'
import SidebarSection from '../common/SidebarSection'

type Props = {
  icon: PinIcon
  color: string
  onIcon: (icon: PinIcon) => void
  /** `commit` false while the colour picker moves */
  onColor: (color: string, commit: boolean) => void
  /** At the right of the title (a selected point's link to what it opens) */
  actions?: ReactNode
  /** No line above it (it is the first thing in the sidebar) */
  first?: boolean
}

/** The pin's icons and colour, open in the sidebar like any section (first, with no line above it) */
export default function PinSection({ icon, color, onIcon, onColor, actions, first }: Props) {
  return (
    <SidebarSection id="pin" title="Pin" actions={actions} first={first}>
      <PinPicker icon={icon} color={color} onIcon={onIcon} onColor={onColor} />
    </SidebarSection>
  )
}
