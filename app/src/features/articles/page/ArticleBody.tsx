import { EMPTY_INFOBOX, type Infobox } from '@map/shared'
import { useEditorState, type Editor, type Extensions } from '@tiptap/react'
import { useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { LuPlus } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import type { TriggerMatch } from '../../../components/ui/editors/typeTrigger'
import { keepFocus } from '../../../lib/keepFocus'
import type { FormValues } from '../../../lib/resource/changed'
import type { AnyResource } from '../../../resources/types'
import InfoBox from '../../infobox/InfoBox'
import { isEmptyInfobox } from '../../infobox/infoRows'
import type { LinkRange } from '../links/docLinks'
import type { ArticleLink } from '../links/linkHref'
import AddSectionPopover from '../sections/AddSectionPopover'
import type { SectionType } from '../sections/sectionTypes'
import ArticleText from '../text/ArticleText'
import type { ArticleText as Text } from '../text/articleText'
import ArticleBanner from './ArticleBanner'
import ArticleTitle from './ArticleTitle'
import { BANNER_HEIGHT } from './pageConfig'

type Props = {
  resource: AnyResource
  /** The values the fields open on (not followed afterwards) */
  start: FormValues
  /** Called with a field's new value after every change (the page keeps all the values and saves them) */
  onField: (name: string, value: string) => void
  /** A reader's page: shown, nothing can be changed */
  readOnly: boolean
  focusField?: string
  /** The article's text (static until it is clicked), and its editor once it was */
  text: Text
  editor: Editor | null
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
  /** The text's extensions (its formats and its links), read once when it opens */
  extensions: Extensions
  /** A link clicked in the static text */
  onLinkClick: (link: ArticleLink, range: LinkRange, el: HTMLElement) => void
  /** Ctrl / ⌘ + F in the static text */
  onFind: () => void
  /** `@` typed in the text (or its menu closed) */
  onMention: (match: TriggerMatch | null) => void
  /** Add section's menu (under the last row) picked a kind */
  onSection: (type: SectionType) => void
  /** The box around the text (positioned): what is placed over the text is placed in it */
  textBox: RefObject<HTMLDivElement | null>
  /** The Info box's own element (the text flows round it) */
  infoBox: RefObject<HTMLElement | null>
  /** Placed in that box: the link's hover card, the jump marks and the sections' ⠿ in its left margin, an open message, the `@` links row */
  textExtras: ReactNode
  /** On the body's left line: the round buttons (Zoom, Messages, Notes) */
  leftTools: ReactNode
  /** Info / Share / ⋯, at the right end of the title's line */
  actions: ReactNode
  infoShown: boolean
  /** Where the article is (its parents), under the banner */
  folders: ReactNode
  /** The icon toolbar, under the title */
  toolbar: ReactNode
  /** Under the text (and Add section): the comments */
  comments: ReactNode
  /** At the bottom (the save status) */
  footer: ReactNode
}

/**
 * The text's parent box (full height, with a border: the banner across its top, reaching the top of the page, then where the article is,
 * the title with Info / Share / ⋯ at its right end, the text, and under its last row, while the cursor is in it, Add section). The Info box floats at the top right of the text, as an encyclopedia's
 * (width 10 to 16rem); it is its own thing: saved in `infobox`, never in the text
 */
export default function ArticleBody(props: Props) {
  const { resource, start, onField: change, readOnly, focusField, text, editor, onUploadImage, onUploadError, textBox, infoBox, infoShown } = props
  const [infobox, setInfobox] = useState<Infobox>(() => JSON.parse(start.infobox ?? 'null') ?? EMPTY_INFOBOX)
  const fields = Object.fromEntries(resource.ui.fields.map((f) => [f.name, f]))
  // The cursor is in the text's last row (its last section, wherever the editor's window is)
  const inLastRow =
    useEditorState({
      editor,
      selector: ({ editor: e }) => !!e && e.isFocused && text.sectionAt(text.fromEditor(e.state.selection.from)) === text.doc().childCount - 1,
    }) ?? false
  const [adding, setAdding] = useState(false)
  const setInfoboxField = (next: Infobox) => {
    setInfobox(next)
    change('infobox', JSON.stringify(next))
  }

  return (
    // Positioned: the round buttons sit on the body's left line (outside the bordered box, which clips)
    <div className="relative flex flex-1 flex-col" style={{ '--banner-h': infobox.banner ? BANNER_HEIGHT.picture : readOnly ? BANNER_HEIGHT.reader : BANNER_HEIGHT.editor } as CSSProperties}>
      {props.leftTools}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The text's parent box: it takes all the height there is and has a border (none on top: the banner reaches the top of the page). Inside it,
            from the top: the banner across it, where the article is, then the title (with the actions at its right end), the toolbar and the text */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-(--card-radius) border border-t-0 border-line bg-surface">
          <ArticleBanner
            image={infobox.banner ?? null}
            onChange={(banner) => setInfoboxField({ ...infobox, banner })}
            onUploadImage={onUploadImage}
            onUploadError={onUploadError}
            readOnly={readOnly}
          />
          {/* The folder buttons sit on the border between the banner and the body, half over each */}
          <div className="relative z-10 -mt-3.5 px-4 pb-1 empty:hidden">{props.folders}</div>
          {/* An editor's page has room at the left for the sections' ⠿ */}
          <div className={`relative flex flex-1 flex-col gap-2 p-4 pt-1 ${readOnly ? '' : 'ps-11'}`}>
            <div className="flex items-center gap-3">
              <ArticleTitle
                start={start.title ?? ''}
                readOnly={readOnly}
                placeholder={fields.title?.placeholder ?? 'Title'}
                autoFocus={!readOnly && (focusField === 'title' || (focusField === undefined && !start.title))}
                onChange={(title) => change('title', title)}
              />
              <div className="ms-auto shrink-0">{props.actions}</div>
            </div>
            {props.toolbar}
            {/* The Info box floats at the text's top right so the text flows around it, like an encyclopedia's; it is not part of the text (saved in `infobox`) */}
            <div ref={textBox} className="relative flow-root">
              {infoShown && !(readOnly && isEmptyInfobox(infobox)) && (
                <aside ref={infoBox} className="relative z-10 float-right mb-3 ms-4 w-[clamp(10rem,30%,16rem)]" aria-label="About this article">
                  <InfoBox value={infobox} onChange={setInfoboxField} onUploadImage={onUploadImage} onUploadError={onUploadError} readOnly={readOnly} />
                </aside>
              )}
              <ArticleText
                text={text}
                extensions={props.extensions}
                label={fields.content?.label ?? 'Text'}
                placeholder={readOnly ? undefined : fields.content?.placeholder}
                autoFocus={!readOnly && focusField === 'content'}
                onUploadImage={onUploadImage}
                onUploadError={onUploadError}
                onLinkClick={props.onLinkClick}
                onFind={props.onFind}
                onMention={props.onMention}
              />
              {props.textExtras}
            </div>
            {/* Under the last row, only while the cursor is in it */}
            {(editor && inLastRow) || adding ? (
              <div className="relative">
                <AddSectionPopover
                  open={adding}
                  onOpenChange={setAdding}
                  onSection={props.onSection}
                  trigger={
                    <Button variant="ghost" size="sm" plain filled icon={LuPlus} aria-expanded={adding} onMouseDown={keepFocus} onClick={() => setAdding(!adding)}>
                      Add section
                    </Button>
                  }
                />
              </div>
            ) : null}
            <div className="mt-4">{props.comments}</div>
            <div className="mt-auto">{props.footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
