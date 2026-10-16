import type { ReactNode } from 'react'
import ValueBar from '../../../../components/ui/fields/ValueBar'
import { DEFAULT_STYLE } from '../../style'
import ColourField from '../../../../components/ui/fields/ColourField'
import SidebarSection from '../common/SidebarSection'
import LineTexturePicker from './LineTexturePicker'
import { styleSetter, type StyleSectionProps } from './lineRows'

/** The common opacities in the menu under the number */
const OPACITY_PRESETS = [10, 25, 50, 75, 100]
/** The common thicknesses in the menu under its number */
const THICKNESS_PRESETS = [1, 3, 6, 10, 20, 40]

type Props = StyleSectionProps & {
  /** A shape's outline calls it Border colour */
  title?: string
  /** A shape's outline may have no thickness (0) */
  minThickness?: number
  /** The line's Texture dropdown (road textures): for the Line tool */
  roads?: boolean
  /** At the top of the section, above the colour */
  before?: ReactNode
  /** At the bottom of the section, below the thickness */
  after?: ReactNode
}

/** The line's colour (a swatch half the row wide, the opacity as a number beside it) and thickness, with room above and below for the kind's own things */
export default function LineColourSection({ title = 'Colour', minThickness = 1, roads, before, after, ...props }: Props) {
  const { style } = props
  const set = styleSetter(props)
  return (
    <SidebarSection id="line-colour" title={title}>
      {before}
      {/* The colour takes a third of the row, the opacity bar the rest (its number and its turn-back icon at the bar's top right) */}
      <div className="grid grid-cols-3 items-end gap-x-3">
        <div className="flex flex-col gap-1">
          <span className="text-small text-fg-muted">Colour</span>
          <ColourField wide label="Colour" value={style.color} onLive={(color) => set({ color }, false)} onCommit={(color) => set({ color })} />
        </div>
        <ValueBar
          className="col-span-2"
          label="Opacity"
          suffix="%"
          value={style.opacity}
          min={1}
          max={100}
          defaultValue={DEFAULT_STYLE.opacity}
          presets={OPACITY_PRESETS}
          grid={{ rows: 2, columns: 3 }}
          onLive={(opacity) => set({ opacity }, false)}
          onCommit={(opacity) => set({ opacity })}
        />
      </div>
      <ValueBar
        label="Thickness"
        value={style.thickness}
        min={minThickness}
        max={40}
        defaultValue={DEFAULT_STYLE.thickness}
        presets={THICKNESS_PRESETS}
        grid={{ rows: 2, columns: 3 }}
        onLive={(thickness) => set({ thickness }, false)}
        onCommit={(thickness) => set({ thickness })}
      />
      {roads && <LineTexturePicker style={style} onPick={(road) => set({ road })} />}
      {after}
    </SidebarSection>
  )
}
