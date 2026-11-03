import type { Patch } from '../../boardStore'
import { lineStylePatch } from '../../drawLine'
import type { LineObject } from '../../types'
import PointToolButton from '../common/PointToolButton'
import SelectionActions from '../common/SelectionActions'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import LineArrowsSection from './LineArrowsSection'
import LineColourSection from './LineColourSection'
import LineEditButtons from './LineEditButtons'
import AttachedTextField from '../common/AttachedTextField'
import ObjectArticleSection from '../common/ObjectArticleSection'
import LineShadowSection from './LineShadowSection'
import LineStrokeSection from './LineStrokeSection'
import LineTypeSection from './LineTypeSection'
import LineWaySection from './LineWaySection'

type Props = ObjectFrameContext & {
  object: LineObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
  pointTool?: boolean
  onPointTool?: () => void
}

/** A selected line's sidebar: colour, opacity and thickness, the four types, the four drawing ways, the arrows, stroke and shadow */
export default function LineSidebar({ object, apply, pointTool = false, onPointTool, ...context }: Props) {
  const section = { style: object.style, onChange: (style: typeof object.style, commit: boolean) => apply(lineStylePatch(object, style), commit) }
  return (
    <ObjectFrame object={object} header={null} {...context}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {/* The title, and its buttons at the right end of its line */}
          <div className="flex items-center justify-between gap-2">
            {onPointTool && <h2 className="text-heading">Line</h2>}
            <SelectionActions selected={[object]} mode={context.mode} onAction={context.onAction} />
          </div>
          {onPointTool && <PointToolButton on={pointTool} onToggle={onPointTool} what="line" />}
        </div>
        <AttachedTextField
          mapId={context.mapId}
          owner={object}
          board={context.board}
          belowFilled={!!object.description || !!object.ref}
          below={context.onOpenArticle && <ObjectArticleSection mapId={context.mapId} object={object} board={context.board} onOpenArticle={context.onOpenArticle} />}
        />
        <LineColourSection
          {...section}
          title="Basic"
          roads
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
