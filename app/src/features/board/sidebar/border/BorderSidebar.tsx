import { useState } from 'react'
import { changeObjects, type Patch } from '../../boardStore'
import type { BorderObject, Fill } from '../../types'
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
  // With more than one enclosed area, the Fill section can give all of them this one's inside colour and opacity
  const [all, setAll] = useState(false)
  const areas = context.board.filter((o): o is BorderObject => o.kind === 'border' && !o.open)
  const toAll = (fill: Fill | null) =>
    changeObjects(context.mapId, {
      update: areas
        .filter((a) => a.id !== object.id)
        .map((a) => ({ id: a.id, patch: { fill: fill ? { ...a.fill, color: fill.color, opacity: fill.opacity } : null } })),
    })
  const section = {
    value: { style: object.style, fill: object.fill, shape: null, param: 0 },
    onChange: (patch: Partial<{ style: BorderObject['style']; fill: BorderObject['fill'] }>, commit: boolean) => {
      apply({ ...(patch.style ? { style: patch.style } : {}), ...(patch.fill !== undefined ? { fill: patch.fill } : {}) }, commit)
      if (all && commit && patch.fill !== undefined) toAll(patch.fill)
    },
  }
  const applyAll = {
    checked: all,
    onChange: (on: boolean) => {
      setAll(on)
      if (on) toAll(object.fill)
    },
  }
  return (
    <ObjectFrame object={object} actions={['focus']} {...context}>
      <div className="flex flex-col gap-3">
        {onPointTool && (
          <div className="flex flex-col gap-2">
            <h2 className="text-heading">Border</h2>
            <PointToolButton on={pointTool} onToggle={onPointTool} what="border" />
          </div>
        )}
        <BorderBasicSection
          {...section}
          roads
          after={<LineEditButtons mode={context.mode} onSplit={context.onSplit} onErase={context.onErase} canSplit={false} />}
        />
        <BorderTypeSection {...section} />
        <BorderWaySection {...section} />
        {!object.open && <BorderFillSection {...section} applyAll={areas.length > 1 ? applyAll : undefined} />}
        {!object.open && <BorderCountySection {...section} />}
        <BorderDescriptionSection text={object.description ?? ''} onSave={(description) => apply({ description }, true)} />
      </div>
    </ObjectFrame>
  )
}
