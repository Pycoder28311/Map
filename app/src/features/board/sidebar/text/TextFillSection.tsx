import ColourOpacityRow from '../common/ColourOpacityRow'
import SidebarSection from '../common/SidebarSection'
import type { TextSource } from './textSource'

/** The text sidebar's Fill section: the colour swatch with the opacity (a number) beside it, each named above */
export default function TextFillSection({ source }: { source: TextSource }) {
  return (
    <SidebarSection id="fill" title="Fill">
      <ColourOpacityRow
        colour={source.shown.color}
        onColourLive={(color) => source.onLive({ color })}
        onColourCommit={source.setColor}
        opacity={source.value.opacity}
        onOpacity={(opacity) => source.onChange({ opacity })}
      />
    </SidebarSection>
  )
}
