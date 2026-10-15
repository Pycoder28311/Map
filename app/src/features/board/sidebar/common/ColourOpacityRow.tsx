import ColourField from '../../../../components/ui/fields/ColourField'
import { NumberField } from '../../NumberBox'

type Props = {
  colour: string
  onColourLive: (colour: string) => void
  onColourCommit: (colour: string) => void
  opacity: number
  onOpacity: (opacity: number) => void
}

/** A colour swatch (two thirds of the row) and the opacity as a number (one third), each with its name in small text above */
export default function ColourOpacityRow({ colour, onColourLive, onColourCommit, opacity, onOpacity }: Props) {
  return (
    <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
      <span className="col-span-2 text-small text-fg-muted">Colour</span>
      <span className="text-small text-fg-muted">Opacity</span>
      <ColourField wide className="col-span-2" label="Colour" value={colour} onLive={onColourLive} onCommit={onColourCommit} />
      <NumberField hideLabel label="Opacity" suffix="%" value={opacity} min={1} max={100} onCommit={onOpacity} />
    </div>
  )
}
