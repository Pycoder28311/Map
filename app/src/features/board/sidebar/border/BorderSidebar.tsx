import type { Patch } from '../../boardStore'
import type { BorderObject } from '../../types'
import PointToolButton from '../common/PointToolButton'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import BorderDescriptionSection from './BorderDescriptionSection'
import BorderCountySection from './BorderCountySection'
import BorderFillSection from './BorderFillSection'
import LineEditButtons from '../line/LineEditButtons'
import BorderBasicSection from './BorderBasicSection'
import BorderTypeSection from './BorderTypeSection'
import BorderWaySection from './BorderWaySection'

type Props = ObjectFrameContext & {
  object: BorderObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
  pointTool?: boolean
  onPointTool?: () => void
}

/** A selected area's sidebar: Basic (colour, opacity, thickness, split and eraser: the same as a line's), the ways to draw it, the inside and its description */
export default function BorderSidebar({ object, apply, pointTool = false, onPointTool, ...context }: Props) {
  const section = {
    value: { style: object.style, fill: object.fill, shape: null, param: 0 },
    onChange: (patch: Partial<{ style: BorderObject['style']; fill: BorderObject['fill'] }>, commit: boolean) =>
      apply({ ...(patch.style ? { style: patch.style } : {}), ...(patch.fill !== undefined ? { fill: patch.fill } : {}) }, commit),
  }
  return (
    <ObjectFrame object={object} actions={['focus']} {...context}>
      <div className="flex flex-col gap-3">
        {onPointTool && (
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-heading">Border</h2>
            <PointToolButton on={pointTool} onToggle={onPointTool} what="border" />
          </div>
        )}
        <BorderBasicSection {...section} roads after={<LineEditButtons mode={context.mode} onSplit={context.onSplit} onErase={context.onErase} splitLabel="Split" />} />
        <BorderTypeSection {...section} />
        <BorderWaySection {...section} />
        {!object.open && <BorderFillSection {...section} />}
        {!object.open && <BorderCountySection {...section} />}
        <BorderDescriptionSection text={object.description ?? ''} onSave={(description) => apply({ description }, true)} />
      </div>
    </ObjectFrame>
  )
}
