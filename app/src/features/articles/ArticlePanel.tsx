import { EMPTY_INFOBOX, type Infobox } from '@map/shared'
import { useEditorState, type Editor, type Extensions } from '@tiptap/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { LuBookmark, LuEllipsis, LuPencilLine, LuInfo, LuPlus, LuSearch, LuShare2 } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { addSection, articleExtensions } from '../../components/ui/editors/articleExtensions'
import RichTextField from '../../components/ui/fields/RichTextField'
import TitleInput from '../../components/ui/fields/TitleInput'
import BarPopover from '../../components/ui/overlays/BarPopover'
import Modal from '../../components/ui/overlays/Modal'
import ItemConflictModal from '../../components/ui/resource/ItemConflictModal'
import NewItemEditor from '../../components/ui/resource/NewItemEditor'
import ResourceItemGate from '../../components/ui/resource/ResourceItemGate'
import SaveStatus from '../../components/ui/resource/SaveStatus'
import { useItemAutosave, type EditedItem } from '../../components/ui/resource/useItemAutosave'
import IconMenu from '../../components/ui/tree/IconMenu'
import { uploadImage } from '../../lib/api/images'
import { useResourceMenu } from '../../lib/resource/actions'
import { valuesOf, type FormValues } from '../../lib/resource/changed'
import { dropFocus, isNewId, peekFocus } from '../../lib/resource/newItem'
import { resourceByName } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { personById, type Person } from '../people/mockPeople'
import PersonCard from '../people/PersonCard'
import ShareOptions from '../share/ShareOptions'
import type { PanelProps } from '../workspace/types'
import { useWorkspace } from '../workspace/useWorkspace'
import ArticleBanner from './ArticleBanner'
import ArticleToolbar from './ArticleToolbar'
import InfoBox from './InfoBox'
import FindBar from './links/FindBar'
import JumpGutter from './links/JumpGutter'
import { resolveJump } from './links/jumpTargets'
import { goTo, linkExtensions, type LinkHandlers } from './links/linkExtensions'
import LinkHoverCard from './links/LinkHoverCard'
import LinkRow, { type LinkPopout } from './links/LinkRow'
import MessagePanel from './links/MessagePanel'
import PrivacyButton from './privacy/PrivacyButton'
import { useArticlePrivacy } from './privacy/privacyStore'
import ProjectFolders from './ProjectFolders'
import type { LinkRange } from './links/docLinks'
import SaveButton from './save/SaveButton'
import { useSaved } from './save/savedStore'
import { useArticleRole } from './save/useArticleRole'
import { useArticleNotes } from './side/articleNotes'
import ContentsTree from './side/ContentsTree'
import MessagesList, { useMessages } from './side/MessagesList'
import NotesPanel from './side/NotesPanel'
import RoundTools, { type SidePart } from './side/RoundTools'

const DATE = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
/** Whether the Info box shows, remembered on this device */
const INFO_SHOWN_KEY = 'map:article-info-shown'

const readInfoShown = () => {
  try {
    return localStorage.getItem(INFO_SHOWN_KEY) !== 'false'
  } catch {
    return true
  }
}
const writeInfoShown = (shown: boolean) => {
  try {
    localStorage.setItem(INFO_SHOWN_KEY, String(shown))
  } catch {
    // Not remembered: it shows again next time
  }
}

/** Below this page width (px) the left column (Contents, Messages, Notes) is not beside the article: its round buttons open it over the text */
const SIDE_MIN_WIDTH = 1024

/** Whether an element is narrower than `width`, followed as it is resized */
function useNarrower(el: HTMLElement | null, width: number) {
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    if (!el) return
    const watcher = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < width))
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [el, width])
  return narrow
}

/** The article's values for autosave: its form fields, and the Info box as JSON text */
const articleValues =
  (resource: AnyResource) =>
  (item: Record<string, unknown>): FormValues => ({
    ...valuesOf(resource, item),
    infobox: JSON.stringify(item.infobox ?? EMPTY_INFOBOX),
  })
const articlePatch = (changed: FormValues): Record<string, unknown> =>
  changed.infobox === undefined ? changed : { ...changed, infobox: JSON.parse(changed.infobox) as Infobox }

/**
 * An article's page (the articles' panel, resources.config.ts): one bordered box: the banner, the folders of its project, the title with Info / Share / ⋯, the toolbar, and the text with the Info box
 * floating at its top right (the text flows around it). Saved as it is edited, like every item (useItemAutosave).
 * With the id `new` (the sidebar's "+") it is the generic page of an item that is made when something is typed (NewItemEditor).
 */
export default function ArticlePanel({ id }: PanelProps) {
  const resource = resourceByName('articles')!
  // The cursor goes back where it was in the page of a new item (NewItemEditor): once
  useEffect(() => {
    if (id) dropFocus(resource.name, id)
  }, [resource.name, id])
  if (!id) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  if (isNewId(id)) return <NewItemEditor resource={resource} />
  return (
    <ResourceItemGate key={id} resource={resource} id={id}>
      {(item) => <ArticlePage key={item.id} resource={resource} item={item} focusField={peekFocus(resource.name, id)} />}
    </ResourceItemGate>
  )
}

function ArticlePage({ resource, item, focusField }: { resource: AnyResource; item: EditedItem; focusField?: string }) {
  const autosave = useItemAutosave(resource, item, {
    values: articleValues(resource),
    toPatch: articlePatch,
  })
  const { menuOf, dialogs } = useResourceMenu(resource)
  const workspace = useWorkspace()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [infoShown, setInfoShown] = useState(readInfoShown)
  const [sharing, setSharing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [privacy] = useArticlePrivacy(String(item.id))
  // The link row's open popout, Search in article, the message open beside the text and the person shown (their words were clicked)
  const [linkPopout, setLinkPopout] = useState<LinkPopout | null>(null)
  // The toolbar's ⋯: its second row, and the link row even with nothing selected
  const [rowsOpen, setRowsOpen] = useState(true)
  // The edit bar's X hides it; a button in its place brings it back
  const [barShown, setBarShown] = useState(true)
  const [finding, setFinding] = useState(false)
  const [message, setMessage] = useState<{ title: string; content: string; from: number; to: number; top: number } | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  // The box around the text: what the message, the hover card and the jump marks are placed in
  const textBox = useRef<HTMLDivElement>(null)
  const panelKey = `${resource.panelType}:${item.id}`
  // Editor or reader (the reader's Save is where Private / Public is; the editor's is in the ⋯ menu)
  const role = useArticleRole()
  const [saved, setSaved] = useSaved(panelKey)
  // The left column's elements the round buttons opened, the zoom, and whether the page is too narrow to have the column beside it
  const [side, setSide] = useState<Set<SidePart>>(new Set())
  const [zoomed, setZoomed] = useState(false)
  const [page, setPage] = useState<HTMLDivElement | null>(null)
  const narrow = useNarrower(page, SIDE_MIN_WIDTH)
  const messages = useMessages(editor)
  const { ids: noteIds } = useArticleNotes(String(item.id))
  const toggleSide = (part: SidePart) => {
    const next = new Set(side)
    if (next.has(part)) next.delete(part)
    else next.add(part)
    setSide(next)
  }

  /** Opens a message beside the text, level with its words (`el`: the link's element, found from the text when not given) */
  const openMessage = (range: LinkRange, el?: HTMLElement | null) => {
    if (range.link.kind !== 'msg') return
    const at = el ?? (editor ? (editor.view.domAtPos(range.from + 1).node as HTMLElement).parentElement?.closest('a') : null)
    const top = (at?.getBoundingClientRect().top ?? 0) - (textBox.current?.getBoundingClientRect().top ?? 0)
    setMessage({ title: range.link.title, content: range.link.content, from: range.from, to: range.to, top: Math.max(0, top) })
  }

  // Zoom: the page goes to the top layer, over the panes, the sidebar and the navbar (they stay as they are under it); Esc leaves it
  useLayoutEffect(() => {
    if (!page) return
    if (zoomed && !page.matches(':popover-open')) page.showPopover()
  }, [page, zoomed])
  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => {
      // Not when a menu, a popout or a modal has the Esc
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('dialog[open]')) setZoomed(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  // What a click on one of the article's links does (linkExtensions.ts reads it when it happens, so it always sees this render's state)
  const handlers = useRef<LinkHandlers>({ onOpen: () => {}, onFind: () => {} })
  useEffect(() => {
    handlers.current = {
      onOpen: (link, range, el) => {
        if (link.kind === 'url' || link.kind === 'project-url') window.open(link.url, '_blank', 'noopener,noreferrer')
        else if (link.kind === 'object') workspace.open({ type: link.type, id: link.id })
        else if (link.kind === 'person') setPerson(personById(link.personId))
        else if (link.kind === 'msg') openMessage(range, el)
        else if (link.kind === 'jump' && editor) {
          const target = resolveJump(editor.state.doc, link.to)
          if (target) goTo(editor, target.kind === 'heading' ? target.from + 1 : target.from, target.kind === 'heading' ? target.end - 1 : target.end)
        }
      },
      onFind: () => setFinding(true),
    }
  })
  // The article's formats and its links: made once, the editor reads them when it opens
  const [extensions] = useState(() => [...articleExtensions, ...linkExtensions(handlers)])

  const onUploadError = (error: unknown) => setUploadError(error instanceof Error ? error.message : 'The picture could not be uploaded.')
  const upload = (file: File) => {
    setUploadError(null)
    return uploadImage(file)
  }
  const name = resource.ui.row.title(item)

  const actions = (
    <div className="relative flex items-center justify-end gap-1">
      {/* Not made yet: it will put the text of a note in the article */}
      <Button variant="text" size="sm" disabled title="Add text from a note (soon)">
        Import from Notes
      </Button>
      {/* Info's place: who can see it (Info is in the ⋯ menu); for a reader, Save */}
      {role === 'editor' ? <PrivacyButton articleId={String(item.id)} /> : <SaveButton panelKey={panelKey} />}
      {/* Only a public article can be shared */}
      {privacy.visibility === 'public' && (
      <BarPopover
        label="Share"
        open={sharing}
        onOpenChange={setSharing}
        align="end"
        trigger={
          <Button variant={sharing ? 'selected' : 'ghost'} size="sm" plain filled icon={LuShare2} aria-expanded={sharing} onClick={() => setSharing(!sharing)}>
            Share
          </Button>
        }
      >
        <ShareOptions id={`${resource.panelType}:${item.id}`} />
      </BarPopover>
      )}
      <IconMenu
        label={`More: ${name}`}
        icon={LuEllipsis}
        turn={false}
        groups={[
          ...menuOf({
            id: item.id,
            title: name,
            pinned: resource.ui.row.pinned?.(item),
          }),
          [
            {
              label: 'Info box',
              icon: LuInfo,
              checked: infoShown,
              onClick: () => {
                setInfoShown(!infoShown)
                writeInfoShown(!infoShown)
              },
            },
            { label: 'Search in article', icon: LuSearch, onClick: () => setFinding(true) },
            // The editor's Save (a reader has it by the title)
            ...(role === 'editor' ? [{ label: saved ? 'Saved' : 'Save', icon: LuBookmark, checked: saved, onClick: () => setSaved(!saved) }] : []),
          ],
        ]}
      />
    </div>
  )

  // The left column: Contents (beside the article on a wide page; on a narrow one only when its round button opened it), then Messages and Notes
  const showContents = !narrow || side.has('contents')
  const sideColumn = (showContents || side.has('messages') || side.has('notes')) && (
    <aside
      aria-label="Article tools"
      className={
        narrow
          ? // Over the text's left side, under the round buttons
            'absolute start-6 top-24 z-40 flex max-h-[calc(100vh-8rem)] w-72 flex-col gap-3 overflow-y-auto rounded-(--card-radius) bg-surface p-1 shadow-xl'
          : 'sticky top-0 flex max-h-screen w-56 shrink-0 flex-col gap-3 self-start overflow-y-auto pt-2 pb-4'
      }
    >
      {showContents && <ContentsTree editor={editor} />}
      {side.has('messages') && (
        <MessagesList
          editor={editor}
          onOpen={(range) => {
            if (editor) goTo(editor, range.from, range.to)
            openMessage(range)
          }}
          onEdit={(range) => {
            editor?.chain().focus().setTextSelection({ from: range.from, to: range.to }).run()
            setLinkPopout('msg')
          }}
        />
      )}
      {side.has('notes') && <NotesPanel articleId={String(item.id)} />}
    </aside>
  )

  return (
    <div
      ref={setPage}
      // Zoomed: in the top layer, filling the window (the article in its middle, as on the page)
      popover={zoomed ? 'manual' : undefined}
      className={`relative mx-auto flex w-full gap-4 px-4 pb-4 ${zoomed ? 'fixed inset-0 m-0 h-full max-h-none max-w-none overflow-auto border-0 bg-surface-muted pt-0 text-fg' : 'min-h-full max-w-[88rem]'}`}
    >
      {sideColumn}
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-3">
      {/* A kept draft (keepMine) is a new start: the fields open again on it */}
      <ArticleBody
        key={autosave.start.version}
        resource={resource}
        start={autosave.start.values}
        onChange={autosave.change}
        focusField={focusField}
        editor={editor}
        onEditor={setEditor}
        onUploadImage={upload}
        onUploadError={onUploadError}
        extensions={extensions}
        textBox={textBox}
        textExtras={
          editor && (
            <>
              <LinkHoverCard editor={editor} />
              <JumpGutter editor={editor} box={textBox} />
              {message && (
                <MessagePanel
                  title={message.title}
                  content={message.content}
                  top={message.top}
                  onClose={() => setMessage(null)}
                  onEdit={() => {
                    editor.chain().focus().setTextSelection({ from: message.from, to: message.to }).run()
                    setMessage(null)
                    setLinkPopout('msg')
                  }}
                />
              )}
            </>
          )
        }
        leftTools={
          <RoundTools
            zoomed={zoomed}
            onZoom={() => setZoomed(!zoomed)}
            open={side}
            onToggle={toggleSide}
            messages={messages.length}
            notes={noteIds.length}
            narrow={narrow}
          />
        }
        actions={actions}
        infoShown={infoShown}
        folders={<ProjectFolders resource={resource} item={item} />}
        toolbar={
          <div className="sticky top-0 z-20 flex flex-col gap-1 bg-surface py-1">
            {barShown ? (
              <ArticleToolbar editor={editor} onUploadImage={upload} onUploadError={onUploadError} secondRow={rowsOpen} onSecondRowChange={setRowsOpen} onClose={() => setBarShown(false)} />
            ) : (
              <Button variant="ghost" size="sm" plain icon={LuPencilLine} className="self-start" onClick={() => setBarShown(true)}>
                Edit bar
              </Button>
            )}
            {/* The third row, smaller and centred, a little gap under the others: the links (while words are selected, or the ⋯ has the rows open) */}
            {barShown && <LinkRow editor={editor} self={`${resource.panelType}:${item.id}`} expanded={rowsOpen} open={linkPopout} onOpenChange={setLinkPopout} />}
            {finding && editor && <FindBar editor={editor} onClose={() => setFinding(false)} />}
            {uploadError && (
              <p role="alert" className="text-small text-danger">
                {uploadError}
              </p>
            )}
          </div>
        }
        footer={
          <div className="flex items-center gap-2">
            <SaveStatus status={autosave.status} />
            <span className="ms-auto text-small text-fg-subtle">Created {DATE.format(new Date(item.createdAt))}</span>
          </div>
        }
      />
      {dialogs}
      <Modal open={!!person} onClose={() => setPerson(null)} title={person?.name ?? 'Person'} size="sm">
        {person && <PersonCard person={person} />}
      </Modal>
      {autosave.conflict && <ItemConflictModal what={resource.ui.label.toLowerCase()} onKeepMine={autosave.keepMine} onUseServers={autosave.useServers} />}
      </div>
    </div>
  )
}

type BodyProps = {
  resource: AnyResource
  /** The values the fields open on (not followed afterwards) */
  start: FormValues
  /** Called with all the values after every change */
  onChange: (values: FormValues) => void
  focusField?: string
  editor: Editor | null
  onEditor: (editor: Editor | null) => void
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
  /** The text's extensions (its formats and its links), read once when it opens */
  extensions: Extensions
  /** The box around the text (positioned): what is placed over the text is placed in it */
  textBox: RefObject<HTMLDivElement | null>
  /** Placed in that box: the link's hover card, the jump marks in its left margin, an open message */
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
  /** Under the text (the save status) */
  footer: ReactNode
}

/**
 * The text's parent box (full height, with a border: the banner across its top, reaching the top of the page, then where the article is,
 * the title with Info / Share / ⋯ at its right end, the text, and under its last row, while the cursor is in it, Add section). The Info box floats at the top right of the text, as an encyclopedia's
 * (width 10 to 16rem); it is its own thing: saved in `infobox`, never in the text
 */
function ArticleBody({
  resource,
  start,
  onChange,
  focusField,
  editor,
  onEditor,
  onUploadImage,
  onUploadError,
  extensions,
  textBox,
  textExtras,
  leftTools,
  actions,
  infoShown,
  folders,
  toolbar,
  footer,
}: BodyProps) {
  // The latest values, so quick changes of different fields all stay
  const latest = useRef(start)
  const [title, setTitle] = useState(start.title ?? '')
  const [infobox, setInfobox] = useState<Infobox>(() => JSON.parse(start.infobox ?? 'null') ?? EMPTY_INFOBOX)
  const change = (name: string, value: string) => {
    latest.current = { ...latest.current, [name]: value }
    onChange(latest.current)
  }
  const fields = Object.fromEntries(resource.ui.fields.map((f) => [f.name, f]))
  // The cursor is in the text's last row (its last top-level block)
  const inLastRow =
    useEditorState({
      editor,
      selector: ({ editor: e }) => !!e && e.isFocused && e.state.selection.$from.index(0) === e.state.doc.childCount - 1,
    }) ?? false

  return (
    // Positioned: the round buttons sit on the body's left line (outside the bordered box, which clips)
    <div className="relative flex flex-1 flex-col">
      {leftTools}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The text's parent box: it takes all the height there is and has a border (none on top: the banner reaches the top of the page). Inside it,
            from the top: the banner across it, where the article is, then the title (with the actions at its right end), the toolbar and the text */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-(--card-radius) border border-t-0 border-line bg-surface">
          <ArticleBanner
            image={infobox.banner ?? null}
            onChange={(banner) => {
              const next = { ...infobox, banner }
              setInfobox(next)
              change('infobox', JSON.stringify(next))
            }}
            onUploadImage={onUploadImage}
            onUploadError={onUploadError}
          />
          {/* The folder buttons sit on the border between the banner and the body, half over each */}
          <div className="relative z-10 -mt-3.5 px-4 pb-1 empty:hidden">{folders}</div>
          <div className="relative flex flex-1 flex-col gap-2 p-4 pt-1">
            <div className="flex items-center gap-3">
              <TitleInput
                size="xl"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  change('title', e.target.value)
                }}
                placeholder={fields.title?.placeholder ?? 'Title'}
                aria-label="Title"
                maxLength={200}
                autoFocus={focusField === 'title' || (focusField === undefined && !start.title)}
                className="min-w-0 flex-1"
              />
              <div className="shrink-0">{actions}</div>
            </div>
            {toolbar}
            {/* The Info box floats at the text's top right so the text flows around it, like an encyclopedia's; it is not part of the text (saved in `infobox`) */}
            <div ref={textBox} className="relative flow-root">
              {infoShown && (
                <aside className="relative z-10 float-right mb-3 ms-4 w-[clamp(10rem,30%,16rem)]" aria-label="About this article">
                  <InfoBox
                    value={infobox}
                    onChange={(next) => {
                      setInfobox(next)
                      change('infobox', JSON.stringify(next))
                    }}
                    onUploadImage={onUploadImage}
                    onUploadError={onUploadError}
                  />
                </aside>
              )}
              <RichTextField
                value={start.content}
                onChange={(html) => change('content', html)}
                label={fields.content?.label ?? 'Text'}
                placeholder={fields.content?.placeholder}
                extensions={extensions}
                onEditor={onEditor}
                onUploadImage={onUploadImage}
                onUploadError={onUploadError}
                autoFocus={focusField === 'content'}
                minHeight="min-h-[40vh]"
              />
              {textExtras}
            </div>
            {/* Under the last row, only while the cursor is in it */}
            {editor && inLastRow && (
              <div>
                <Button variant="ghost" size="sm" plain filled icon={LuPlus} onMouseDown={(e) => e.preventDefault()} onClick={() => addSection(editor)}>
                  Add section
                </Button>
              </div>
            )}
            <div className="mt-auto">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
