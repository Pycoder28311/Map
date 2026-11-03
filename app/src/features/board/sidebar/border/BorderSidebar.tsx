import { useState } from 'react'
import { changeObjects, type Patch } from '../../boardStore'
import type { BorderObject, Fill } from '../../types'
import AttachedTextField from '../common/AttachedTextField'
import ObjectArticleSection from '../common/ObjectArticleSection'
import PointToolButton from '../common/PointToolButton'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import SelectionActions from '../common/SelectionActions'
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
    // A closed area's sidebar starts like a line's: the text in it (its name), then its description and article (an open one keeps the name row)
    <ObjectFrame object={object} actions={['focus']} header={object.open ? undefined : null} {...context}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {/* The title, and its buttons at the right end of its line */}
          <div className="flex items-center justify-between gap-2">
            {onPointTool && <h2 className="text-heading">Border</h2>}
            <SelectionActions selected={[object]} mode={context.mode} onAction={context.onAction} />
          </div>
          {onPointTool && <PointToolButton on={pointTool} onToggle={onPointTool} what="border" />}
        </div>
        {!object.open && (
          <AttachedTextField
            mapId={context.mapId}
            owner={object}
            board={context.board}
            belowFilled={!!object.description || !!object.ref}
            below={context.onOpenArticle && <ObjectArticleSection mapId={context.mapId} object={object} board={context.board} onOpenArticle={context.onOpenArticle} />}
          />
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
      </div>
    </ObjectFrame>
  )
}
