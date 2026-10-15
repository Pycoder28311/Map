import type { Patch } from '../../boardStore'
import type { ShapeObject, Style } from '../../types'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import LineColourSection from '../line/LineColourSection'
import LineShadowSection from '../line/LineShadowSection'
import LineStrokeSection from '../line/LineStrokeSection'
import LineTypeSection from '../line/LineTypeSection'
import ShapeSection, { type ShapeChange } from './ShapeSection'

type Props = ObjectFrameContext & {
  object: ShapeObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
}

/** A selected shape's sidebar: the shape with its number, turn and fill, then the border's colour, thickness, type, stroke and shadow */
export default function ShapeSidebar({ object, apply, ...context }: Props) {
  const outline = { style: object.style, onChange: (style: Style, commit: boolean) => apply({ style }, commit) }
  return (
    <ObjectFrame object={object} {...context}>
      <div className="flex flex-col gap-3">
        <ShapeSection value={object} onChange={(patch: ShapeChange, commit) => apply(patch, commit)} rotation={object.rotation} onRotation={(rotation) => apply({ rotation }, true)} />
        <LineColourSection {...outline} title="Border colour" minThickness={0} />
        <LineTypeSection {...outline} />
        <LineStrokeSection {...outline} />
        <LineShadowSection {...outline} />
      </div>
    </ObjectFrame>
  )
}
