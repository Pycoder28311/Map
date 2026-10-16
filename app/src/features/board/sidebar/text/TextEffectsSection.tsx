import ColourField from '../../../../components/ui/fields/ColourField'
import ValueBar from '../../../../components/ui/fields/ValueBar'
import { NumberField } from '../../NumberBox'
import CaptionedRow from '../common/CaptionedRow'
import SidebarSection from '../common/SidebarSection'
import type { TextSource } from './textSource'
import { CURVE_MAX } from '../../textCurve'


/** The text sidebar's Stroke (colour, intensity, opacity), Shadow (colour, size, x and y offset) and Curveness (a bar) sections: numbers, not sliders, except the bar */
export default function TextEffectsSection({ source }: { source: TextSource }) {
  const { value, onLive, onChange: onCommit } = source
  return (
    <>
      <SidebarSection
        id="stroke"
        title="Stroke"
        check={{
          checked: value.strokeWidth > 0,
          label: 'Stroke',
          onChange: (on) => onCommit({ strokeWidth: on ? 2 : 0 }),
        }}
      >
        <CaptionedRow
          fields={[
            { label: 'Colour', node: <ColourField wide label="Stroke colour" value={value.strokeColor} onLive={(strokeColor) => onLive({ strokeColor })} onCommit={(strokeColor) => onCommit({ strokeColor })} /> },
            { label: 'Intensity', node: <NumberField hideLabel label="Intensity" value={value.strokeWidth} min={0} max={20} onCommit={(strokeWidth) => onCommit({ strokeWidth })} /> },
            { label: 'Opacity', node: <NumberField hideLabel label="Opacity" suffix="%" value={value.strokeOpacity} min={1} max={100} onCommit={(strokeOpacity) => onCommit({ strokeOpacity })} /> },
          ]}
        />
      </SidebarSection>
      <SidebarSection
        id="shadow"
        title="Shadow"
        check={{
          checked: value.shadowBlur > 0 || value.shadowDistance !== 0 || value.shadowY !== 0,
          label: 'Shadow',
          onChange: (on) => onCommit(on ? { shadowBlur: 4, shadowDistance: 3, shadowY: 3 } : { shadowBlur: 0, shadowDistance: 0, shadowY: 0 }),
        }}
      >
        <CaptionedRow
          fields={[
            { label: 'Colour', node: <ColourField wide label="Shadow colour" value={value.shadowColor} onLive={(shadowColor) => onLive({ shadowColor })} onCommit={(shadowColor) => onCommit({ shadowColor })} /> },
            { label: 'Size', node: <NumberField hideLabel label="Size" value={value.shadowBlur} min={0} max={40} onCommit={(shadowBlur) => onCommit({ shadowBlur })} /> },
            { label: 'X offset', node: <NumberField hideLabel label="X offset" value={value.shadowDistance} min={-40} max={40} onCommit={(shadowDistance) => onCommit({ shadowDistance })} /> },
            { label: 'Y offset', node: <NumberField hideLabel label="Y offset" value={value.shadowY} min={-40} max={40} onCommit={(shadowY) => onCommit({ shadowY })} /> },
          ]}
        />
      </SidebarSection>
      <SidebarSection id="curveness" title="Curveness">
        <ValueBar
          hideLabel
          label="Curveness"
          value={value.curve}
          min={-CURVE_MAX}
          max={CURVE_MAX}
          defaultValue={0}
          presets={[-100, -50, -25, 0, 25, 50, 100]}
          grid={{ rows: 2, columns: 4 }}
          onLive={(curve) => onLive({ curve })}
          onCommit={(curve) => onCommit({ curve })}
        />
      </SidebarSection>
    </>
  )
}
