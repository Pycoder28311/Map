import LineOptions from './LineOptions'
import ShapeFields, { type ShapeValues } from './ShapeFields'
import type { ShapeObject, Style } from './types'

export type ShapePatch = Partial<ShapeValues> & { style?: Style }

type Props = { object: ShapeObject; onChange: (patch: ShapePatch, commit: boolean) => void }

/** A selected shape's options: the shape, its number, its fill, then the outline's line controls */
export default function ShapeOptions({ object, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ShapeFields value={object} onChange={onChange} />
      <LineOptions kind="shape" style={object.style} onChange={(style, commit) => onChange({ style }, commit)} />
    </div>
  )
}
