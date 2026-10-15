import { useState } from 'react'
import { LuPencil } from 'react-icons/lu'
import type { Patch } from '../../changes'
import { labelPatch } from '../../drawPoint'
import PinPicker from '../../PinPicker'
import PinBadge from '../../PinIconView'
import PointLinks from '../../PointLinks'
import type { PointObject } from '../../types'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import PointBannerSection from './PointBannerSection'
import PointDescriptionSection from './PointDescriptionSection'
import PointLabelSection from './PointLabelSection'

type Props = ObjectFrameContext & {
  object: PointObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
}

/** A pin's sidebar: banner, pin, name, label, description, and what it is linked to */
export default function PointSidebar({ object, apply, ...context }: Props) {
  const [picking, setPicking] = useState(false)

  return (
    <ObjectFrame
      object={object}
      actions={['focus', 'duplicate']}
      top={<PointBannerSection banner={object.banner} onChange={(banner) => apply({ banner }, true)} />}
      leading={
        <button
          type="button"
          aria-label="Change pin"
          aria-expanded={picking}
          title="Change the pin"
          onClick={() => setPicking(!picking)}
          className="relative cursor-pointer rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PinBadge icon={object.icon} color={object.color} className="size-9" />
          <span className="absolute -end-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-fg text-bg">
            <LuPencil className="size-2.5" />
          </span>
        </button>
      }
      {...context}
    >
      {picking && <PinPicker icon={object.icon} color={object.color} onIcon={(icon) => apply({ icon }, true)} onColor={(color, commit) => apply({ color }, commit)} />}
      <PointLabelSection label={object.label} onChange={(label) => apply(labelPatch(object, label), true)} />
      <PointDescriptionSection id={object.id} description={object.description} onSave={(description) => apply({ description }, true)} />
      <PointLinks links={object.links} board={context.board} onShowBoardObject={context.onShowBoardObject} />
    </ObjectFrame>
  )
}
