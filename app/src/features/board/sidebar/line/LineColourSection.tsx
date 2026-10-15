import type { ReactNode } from 'react'
import RangeField from '../../../../components/ui/fields/RangeField'
import ColourOpacityRow from '../common/ColourOpacityRow'
import SidebarSection from '../common/SidebarSection'
import { styleSetter, type StyleSectionProps } from './lineRows'

type Props = StyleSectionProps & {
  /** A shape's outline calls it Border colour */
  title?: string
  /** A shape's outline may have no thickness (0) */
  minThickness?: number
  /** At the top of the section, above the colour */
  before?: ReactNode
  /** At the bottom of the section, below the thickness */
  after?: ReactNode
}

/** The line's colour (a swatch half the row wide, the opacity as a number beside it) and thickness, with room above and below for the kind's own things */
export default function LineColourSection({ title = 'Colour', minThickness = 1, before, after, ...props }: Props) {
  const { style } = props
  const set = styleSetter(props)
  return (
    <SidebarSection id="line-colour" title={title}>
      {before}
      <ColourOpacityRow colour={style.color} onColourLive={(color) => set({ color }, false)} onColourCommit={(color) => set({ color })} opacity={style.opacity} onOpacity={(opacity) => set({ opacity })} />
      <RangeField label="Thickness" value={style.thickness} min={minThickness} max={40} onLive={(thickness) => set({ thickness }, false)} onCommit={(thickness) => set({ thickness })} />
      {after}
    </SidebarSection>
  )
}
