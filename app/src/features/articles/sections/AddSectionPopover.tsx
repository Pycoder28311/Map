import type { ReactNode } from 'react'
import BarPopover from '../../../components/ui/overlays/BarPopover'
import { SectionPicker } from './SectionMenu'
import type { SectionType } from './sectionTypes'

/**
 * Add section: a popout with the menu of section kinds (the same as typing / in the text), closed by a pick. The toolbar's (row 2) and the
 * one under the text's last row are this one, each with its own button (`trigger`) and its own open state
 */
export default function AddSectionPopover({
  open,
  onOpenChange,
  width,
  trigger,
  onSection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  width?: string
  trigger: ReactNode
  onSection: (type: SectionType) => void
}) {
  return (
    <BarPopover label="Add section" open={open} onOpenChange={onOpenChange} width={width} trigger={trigger}>
      <SectionPicker
        onPick={(type) => {
          onOpenChange(false)
          onSection(type)
        }}
      />
    </BarPopover>
  )
}
