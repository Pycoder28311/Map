import { KEEP_EDITING } from '../../activeEditor'
import type { Patch } from '../../boardStore'
import { fullStyle } from '../../textStyles'
import type { Patch as ChangePatch } from '../../changes'
import type { TextObject } from '../../types'
import ObjectFrame, { type ObjectFrameContext } from '../common/ObjectFrame'
import TextEffectsSection from './TextEffectsSection'
import TextFillSection from './TextFillSection'
import TextFontSection from './TextFontSection'
import TextHeaderSection from './TextHeaderSection'
import TextSizeSection from './TextSizeSection'
import TextStylesSection from './TextStylesSection'
import { useTextSource } from './textSource'

type Props = ObjectFrameContext & {
  object: TextObject
  /** A held change previews; `commit` saves it as one undo step */
  apply: (patch: Patch, commit: boolean) => void
}

/** A selected text's sidebar: what it says and what it is connected to, then size, font, fill, effects and the looks of other texts */
export default function TextSidebar({ object, apply, ...context }: Props) {
  const { mapId } = context
  const source = useTextSource(mapId, object)
  return (
    <ObjectFrame
      object={object}
      {...context}
      header={
        <TextHeaderSection
          mapId={mapId}
          text={object}
          board={context.board}
          onFocus={context.onFocus}
          onShowBoardObject={context.onShowBoardObject}
        />
      }
    >
      <div {...{ [KEEP_EDITING]: '' }} className="flex flex-col gap-3">
        <TextSizeSection source={source} />
        <TextFontSection source={source} />
        <TextFillSection source={source} />
        <TextEffectsSection source={source} />
        <TextStylesSection key={object.id} mapId={mapId} exclude={object.id} current={object} apply={(style) => apply(fullStyle(style) as ChangePatch, true)} />
      </div>
    </ObjectFrame>
  )
}
