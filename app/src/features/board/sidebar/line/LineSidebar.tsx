import type { Patch } from '../../boardStore'
import { lineStylePatch } from '../../drawLine'
import type { LineObject } from '../../types'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import LineArrowsSection from './LineArrowsSection'
import LineColourSection from './LineColourSection'
import LineEditButtons from './LineEditButtons'
import LineTextField from './LineTextField'
import LineShadowSection from './LineShadowSection'
import LineStrokeSection from './LineStrokeSection'
import LineTypeSection from './LineTypeSection'
import LineWaySection from './LineWaySection'

type Props = ObjectFrameContext & {
  object: LineObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
}

/** A selected line's sidebar: colour, opacity and thickness, the four types, the four drawing ways, the arrows, stroke and shadow */
export default function LineSidebar({ object, apply, ...context }: Props) {
  const section = { style: object.style, onChange: (style: typeof object.style, commit: boolean) => apply(lineStylePatch(object, style), commit) }
  return (
    <ObjectFrame object={object} header={null} footerAction={null} {...context}>
      <div className="flex flex-col gap-3">
        <LineTextField mapId={context.mapId} line={object} board={context.board} />
        <LineColourSection
          {...section}
          title="Basic"
          after={<LineEditButtons mode={context.mode} onSplit={context.onSplit} onErase={context.onErase} />}
        />
        <LineTypeSection {...section} />
        <LineWaySection {...section} />
        <LineArrowsSection {...section} />
        <LineStrokeSection {...section} />
        <LineShadowSection {...section} />
      </div>
    </ObjectFrame>
  )
}
