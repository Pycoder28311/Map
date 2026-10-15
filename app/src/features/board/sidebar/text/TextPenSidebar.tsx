import { setTextPen, useTextPen } from '../../pen'
import { fullStyle } from '../../textStyles'
import SidePanel from '../common/SidePanel'
import TextEffectsSection from './TextEffectsSection'
import TextFillSection from './TextFillSection'
import TextFontSection from './TextFontSection'
import TextSizeSection from './TextSizeSection'
import TextStylesSection from './TextStylesSection'
import { usePenTextSource } from './textSource'

/** The Text tool's sidebar: what the next text starts with (not undoable, not part of any map) */
export default function TextPenSidebar({ mapId }: { mapId: string }) {
  const pen = useTextPen()
  const source = usePenTextSource()
  return (
    <SidePanel label="Text options">
      <h2 className="text-heading">Text</h2>
      <p className="text-small text-fg-muted">Click on the map to type; drag to make a box that wraps.</p>
      <TextSizeSection source={source} />
      <TextFontSection source={source} />
      <TextFillSection source={source} />
      <TextEffectsSection source={source} />
      <TextStylesSection
        mapId={mapId}
        exclude={null}
        current={{ ...pen, underlineColor: pen.underlineColor ?? undefined, strikeColor: pen.strikeColor ?? undefined, boxColor: pen.boxColor ?? undefined }}
        apply={(style) => {
          const full = fullStyle(style)
          setTextPen({ ...full, underlineColor: full.underlineColor ?? null, strikeColor: full.strikeColor ?? null, boxColor: full.boxColor ?? null })
        }}
      />
    </SidePanel>
  )
}
