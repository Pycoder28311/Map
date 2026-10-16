import { roadSample } from '../../samples'
import { ROADS } from '../../roadTextures'
import StyleSample from '../../StyleSample'
import type { Style } from '../../types'
import OptionRowPicker from '../common/OptionRowPicker'

type Props = { style: Style; onPick: (road: number | undefined) => void }

/** The line's texture: one row with the picked one and an arrow that opens the others, each with a little example */
export default function LineTexturePicker({ style, onPick }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-small text-fg-muted">Texture</span>
      <OptionRowPicker
        label="Texture"
        value={style.road ?? 0}
        onChange={(i) => onPick(i || undefined)}
        options={ROADS.map((road, i) => ({ value: i, label: road.label, sample: (w) => <StyleSample object={roadSample(style, i, w, 28)} width={w} height={28} /> }))}
      />
    </div>
  )
}
