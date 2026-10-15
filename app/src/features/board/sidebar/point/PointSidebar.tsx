import type { Patch } from '../../changes'
import ForwardLink from '../../ForwardLink'
import PointLinks from '../../PointLinks'
import type { PointObject } from '../../types'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import PinSection from './PinSection'
import PointBannerSection from './PointBannerSection'

type Props = ObjectFrameContext & {
  object: PointObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
}

/** A pin's sidebar: the pin (icons and colour, open; with the link to what it opens), the banner picture and what it is linked to */
export default function PointSidebar({ object, apply, ...context }: Props) {
  return (
    <ObjectFrame
      object={object}
      top={
        <PinSection
          first
          icon={object.icon}
          color={object.color}
          onIcon={(icon) => apply({ icon }, true)}
          onColor={(color, commit) => apply({ color }, commit)}
          actions={<ForwardLink object={object} board={context.board} onShowBoardObject={context.onShowBoardObject} />}
        />
      }
      header={<PointBannerSection banner={object.banner} onChange={(banner) => apply({ banner }, true)} />}
      {...context}
    >
      <PointLinks links={object.links} board={context.board} onShowBoardObject={context.onShowBoardObject} />
    </ObjectFrame>
  )
}
