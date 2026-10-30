import { AllSelection } from '@tiptap/pm/state'
import { Extension, type Editor, type Extensions } from '@tiptap/react'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from 'react'
import { insertImages } from '../../../components/ui/editors/insertImages'
import RichTextEditor from '../../../components/ui/editors/RichTextEditor'
import { typeTrigger, type TriggerHandlers, type TriggerMatch } from '../../../components/ui/editors/typeTrigger'
import { useImagePicker } from '../../../components/ui/editors/useImagePicker'
import { RICH_TEXT_CLASSES } from '../../../components/ui/fields/RichTextField'
import FloatingAt from '../../../components/ui/overlays/FloatingAt'
import { linkAt, type LinkRange } from '../links/docLinks'
import { fromHref, LINK_PREFIX, type ArticleLink } from '../links/linkHref'
import SectionMenu from '../sections/SectionMenu'
import { useSectionMenu } from '../sections/useSectionMenu'
import { placeSection, type SectionType } from '../sections/sectionTypes'
import { windowDoc, type TextWindow } from './articleDoc'
import { caretPoint, type ArticleText as Text } from './articleText'
import StaticSections from './StaticSections'

/** The faint words on the empty row the caret is on */
export const SECTION_HINT = 'Type / for sections and @ for links'

/** The text's own keys: Ctrl / ⌘ + A a second time selects all of a big text (the window grows to all of it), Alt + ↑ / ↓ moves the caret's section */
function textKeys(text: Text) {
  return Extension.create({
    name: 'articleTextKeys',
    addKeyboardShortcuts() {
      const sectionOf = (editor: Editor) => text.sectionAt(text.fromEditor(editor.state.selection.head))
      return {
        'Mod-a': ({ editor }) => {
          const { from, to } = editor.state.selection
          const all = editor.state.selection instanceof AllSelection || (from <= 1 && to >= editor.state.doc.content.size - 1)
          if (text.holdsAll() || !all) return false
          void text.openAll().then((ed) => ed?.commands.selectAll())
          return true
        },
        'Alt-ArrowUp': ({ editor }) => {
          const index = sectionOf(editor)
          if (index > 0) text.moveSection(index, index - 1)
          return true
        },
        'Alt-ArrowDown': ({ editor }) => {
          const index = sectionOf(editor)
          if (index < text.doc().childCount - 1) text.moveSection(index, index + 2)
          return true
        },
      }
    },
  })
}

type Props = {
  text: Text
  /** The article's formats and links (the window's editor gets them, with the text's own keys and the `/` `@` menus) */
  extensions: Extensions
  /** Screen-reader name */
  label: string
  /** Shown while the text is empty */
  placeholder?: string
  /** Opens for editing at once, the caret at the end */
  autoFocus?: boolean
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
  /** One of the article's links was clicked in the static text (in the editor, its own click handler tells the page) */
  onLinkClick: (link: ArticleLink, range: LinkRange, el: HTMLElement) => void
  /** Ctrl / ⌘ + F in the text before it is opened */
  onFind: () => void
  /** `@` was typed (where, in the editor's document), or its menu closed (null) */
  onMention: (match: TriggerMatch | null) => void
}

/**
 * The article's text (docs/plans/36): plain HTML until an editor clicks it, then a TipTap editor over the whole text, or over a window of
 * sections around the click when it is big (the rest stays static around it, with the same look, so nothing moves). A reader's page never
 * gets an editor. Typing `/` opens the section menu under the caret's row; `@` tells the page (it opens the links row above it)
 */
export default function ArticleText({ text, extensions, label, placeholder, autoFocus, onUploadImage, onUploadError, onLinkClick, onFind, onMention }: Props) {
  const version = useSyncExternalStore(text.subscribe, text.getVersion)
  const { base, window } = text.view
  const editor = text.editor

  // The `/` menu: where its `/` is and what was typed after it
  const [slash, setSlash] = useState<TriggerMatch | null>(null)
  const images = useImagePicker(() => text.editor, onUploadImage, onUploadError)
  const pick = (type: SectionType) => {
    const ed = text.editor
    if (!ed || !slash) return
    setSlash(null)
    placeSection(ed, type, { pickImage: images.open }, { from: slash.from, to: slash.to })
  }
  const menu = useSectionMenu(slash?.query ?? '', pick)
  // What the `/` and `@` extensions call (they read these when something happens: the latest menu keys and page)
  const latest = useRef({ menuKey: menu.onKey, onMention })
  useLayoutEffect(() => {
    latest.current = { menuKey: menu.onKey, onMention }
  })
  const [slashHandlers] = useState<{ current: TriggerHandlers }>(() => ({
    current: { onChange: (match) => setSlash(match), onClose: () => setSlash(null), onKey: (e) => latest.current.menuKey(e) },
  }))
  const [mentionHandlers] = useState<{ current: TriggerHandlers }>(() => ({
    current: { onChange: (match) => latest.current.onMention(match), onClose: () => latest.current.onMention(null) },
  }))
  // Made once: the editor reads them when it opens
  const [ownExtensions] = useState(() => [...extensions, textKeys(text), typeTrigger('/', slashHandlers), typeTrigger('@', mentionHandlers)])

  // After a reset the static parts are drawn (their own layout effects ran first): the editor gets the window now, before the paint
  useLayoutEffect(() => text.sync(), [text, version])
  useEffect(() => {
    if (autoFocus) void text.open('end')
    // Once, when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** A click in the static text: a link is followed; otherwise the text opens for editing where the click was (or on the words selected) */
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (editor?.view.dom.contains(target)) return
    const anchor = target.closest('a')
    const href = anchor?.getAttribute('href')
    if (anchor && href?.startsWith(LINK_PREFIX)) {
      e.preventDefault()
      const pos = text.posAtDom(anchor, 0)
      const link = fromHref(href)
      const range = pos === null ? null : linkAt(text.doc(), pos + 1)
      if (link && range) onLinkClick(link, range, anchor)
      return
    }
    if (anchor || !text.editable) return
    // A checklist's box is ticked in the editor, not here
    if (target instanceof HTMLInputElement) e.preventDefault()
    const selection = document.getSelection()
    if (selection && !selection.isCollapsed && e.currentTarget.contains(selection.anchorNode)) {
      const a = text.posAtDom(selection.anchorNode, selection.anchorOffset)
      const b = text.posAtDom(selection.focusNode, selection.focusOffset)
      if (a !== null && b !== null) return void text.open({ from: Math.min(a, b), to: Math.max(a, b) })
    }
    const point = target === e.currentTarget ? null : caretPoint(e.clientX, e.clientY)
    const pos = point ? text.posAtDom(point.node, point.offset) : null
    void text.open(pos ?? 'end')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editor) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      onFind()
    } else if (e.key === 'Enter' && text.editable) {
      e.preventDefault()
      void text.open('start')
    }
  }

  const empty = base.childCount === 1 && base.firstChild?.type.name === 'paragraph' && base.firstChild.content.size === 0
  return (
    <div
      ref={(el) => {
        text.root = el
      }}
      aria-label={label}
      // Before it is opened the text can get the focus (Enter opens it); then the editor has it
      tabIndex={text.editable && !editor ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`article-text relative min-h-[40vh] outline-none ${RICH_TEXT_CLASSES}`}
    >
      {/* (keys: the part before the window is the same element with or without one, so the first click redraws nothing before it) */}
      <StaticSections key="before" doc={base} from={0} to={window ? window.start : base.childCount} />
      {window && (
        <WindowEditor
          text={text}
          window={window}
          extensions={ownExtensions}
          label={label}
          placeholder={placeholder}
          onImageFiles={(files) => text.editor && void insertImages(text.editor, files, onUploadImage, onUploadError)}
        />
      )}
      {window && <StaticSections key="after" doc={base} from={window.end} to={base.childCount} />}
      {!window && empty && placeholder && (
        <p aria-hidden className="pointer-events-none absolute start-0 top-0 text-fg-subtle">
          {placeholder}
        </p>
      )}
      {slash && editor && (
        <FloatingAt anchor={slash.rect} side="below" label="Sections" onDismiss={() => setSlash(null)} className="w-64 rounded-(--menu-radius) border border-line bg-surface p-(--menu-p) shadow-lg">
          <SectionMenu types={menu.types} active={menu.active} onActive={menu.setActive} onPick={pick} />
        </FloatingAt>
      )}
      {images.input}
    </div>
  )
}

/** The editor of the window: it starts with the window's sections; afterwards the text (ArticleText) loads it again when the window moves */
function WindowEditor({ text, window, extensions, label, placeholder, onImageFiles }: { text: Text; window: TextWindow; extensions: Extensions; label: string; placeholder?: string; onImageFiles: (files: File[]) => void }) {
  const [content] = useState(() => windowDoc(text.view.base, window).toJSON())
  return (
    <RichTextEditor
      content={content}
      label={label}
      extensions={extensions}
      placeholder={({ editor, node }) => (editor.isEmpty ? (placeholder ?? '') : node.type.name === 'paragraph' ? SECTION_HINT : '')}
      onEditor={text.attach}
      onImageFiles={onImageFiles}
    />
  )
}
