import { EMPTY_INFOBOX, type Infobox, type ItemAccess, type Visibility } from '@map/shared'
import { useEditorState, type Editor, type Extensions } from '@tiptap/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { LuBookmark, LuEllipsis, LuInfo, LuLock, LuLockOpen, LuPlus, LuSearch, LuShare2 } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { articleExtensions } from '../../components/ui/editors/articleExtensions'
import { closeTypeTrigger, type TriggerMatch } from '../../components/ui/editors/typeTrigger'
import { useImagePicker } from '../../components/ui/editors/useImagePicker'
import TitleInput from '../../components/ui/fields/TitleInput'
import BarPopover from '../../components/ui/overlays/BarPopover'
import FloatingAt from '../../components/ui/overlays/FloatingAt'
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
import { authClient } from '../../lib/auth-client'
import { useTimeout } from '../../lib/useTimeout'
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
import { linkExtensions, removeArticleLink, type LinkHandlers } from './links/linkExtensions'
import LinkHoverCard from './links/LinkHoverCard'
import LinkRow, { type LinkPopout } from './links/LinkRow'
import MessagePanel from './links/MessagePanel'
import { forgetArticleMessages } from './messages/messagesStore'
import { useLegacyMessages } from './messages/useLegacyMessages'
import { adoptRules, fromStored, toStored, type AutoRule } from './links/autolink'
import PrivacyPanel from '../sharing/PrivacyPanel'
import { useSharing } from '../sharing/sharing'
import { isEmptyInfobox } from './infoRows'
import ProjectFolders from './ProjectFolders'
import { linkAt, type LinkRange } from './links/docLinks'
import type { ArticleLink } from './links/linkHref'
import SaveButton from './save/SaveButton'
import { useSaved } from './save/savedStore'
import { useArticleRole } from './save/useArticleRole'
import { useArticleNotes } from './side/articleNotes'
import ContentsTree from './side/ContentsTree'
import MessagesList, { useMessages } from './side/MessagesList'
import NotesPanel from './side/NotesPanel'
import RoundTools, { type SidePart } from './side/RoundTools'
import { SectionPicker } from './sections/SectionMenu'
import { placeSection, type SectionType } from './sections/sectionTypes'
import CommentsSection from './comments/CommentsSection'
import ArticleText from './text/ArticleText'
import { useArticleText, useTextEditor, type ArticleText as Text } from './text/articleText'
import SectionHandles from './text/SectionHandles'

const DATE = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
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

/** The article's values for autosave: its form fields, and the Info box and the autolinkers as JSON text */
const articleValues =
  (resource: AnyResource) =>
  (item: Record<string, unknown>): FormValues => ({
    ...valuesOf(resource, item),
    infobox: JSON.stringify(item.infobox ?? EMPTY_INFOBOX),
    // (a reader's copy has none: they never save)
    autolinkers: JSON.stringify(item.autolinkers ?? []),
  })
const articlePatch = (changed: FormValues): Record<string, unknown> => ({
  ...changed,
  ...(changed.infobox === undefined ? {} : { infobox: JSON.parse(changed.infobox) as Infobox }),
  ...(changed.autolinkers === undefined ? {} : { autolinkers: JSON.parse(changed.autolinkers) as unknown }),
})

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
  const { data: session } = authClient.useSession()

  // The values the page saves, all of them in one object: a change of one field (the text, the title, the Info box, the autolinkers) goes
  // into it and the autosave gets them all, so two fields changed together (the text and its autolinkers) are one save. It starts again
  // with every new start (a draft kept, the server's version taken)
  const values = useRef({ start: autosave.start.version, all: autosave.start.values })
  const field = (name: string, value: string) => {
    if (values.current.start !== autosave.start.version) values.current = { start: autosave.start.version, all: autosave.start.values }
    values.current.all = { ...values.current.all, [name]: value }
    autosave.change(values.current.all)
  }
  // The article's autolinkers (docs/plans/35): held here, read by the Autolinker while typing and shown by its panel; a change is saved with the text
  const [rules, setRulesState] = useState(() => ({ start: autosave.start.version, list: fromStored(autosave.start.values.autolinkers) }))
  if (rules.start !== autosave.start.version) setRulesState({ start: autosave.start.version, list: fromStored(autosave.start.values.autolinkers) })
  const setRules = (next: AutoRule[]) => {
    setRulesState({ start: autosave.start.version, list: next })
    field('autolinkers', JSON.stringify(toStored(next)))
  }
  // The Info box always shows (it had a switch in the ⋯ menu once)
  const infoShown = true
  // Who can see the article (its owner's: the ⋯ menu's Private / Public); the people are read only when its panel opens
  const privacy = useSharing('articles', Number(item.id), (item.visibility as Visibility | undefined) ?? 'private')
  const [sharing, setSharing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // The link row's open popout, Search in article, the message open beside the text and the person shown (their words were clicked)
  const [linkPopout, setLinkPopout] = useState<LinkPopout | null>(null)
  // The toolbar's More: its second row
  const [rowsOpen, setRowsOpen] = useState(true)
  // Link types (row 2): the links row shown under the bar with nothing selected
  const [linkTypesShown, setLinkTypesShown] = useState(false)
  // `@` typed in the text: the links row floats above its row (and is not shown under the bar meanwhile)
  const [mention, setMention] = useState<TriggerMatch | null>(null)
  const [finding, setFinding] = useState(false)
  // The ⋯ menu's Info: how to edit the article
  const [editInfo, setEditInfo] = useState(false)
  // The message open beside the text: its id (null: an old one, its text in the link), its words and where it opens
  // (`hover`: opened by the pointer resting on its words, it closes when the pointer leaves them and its panel)
  const [message, setMessage] = useState<{ id: number | null; legacy?: { title: string; content: string }; from: number; to: number; top: number; anchor?: { x: number; y: number }; hover?: boolean } | null>(null)
  const { set: laterClose, clear: cancelClose } = useTimeout()
  const [person, setPerson] = useState<Person | null>(null)
  // The box around the text: what the message, the hover card and the jump marks are placed in
  const textBox = useRef<HTMLDivElement>(null)
  const panelKey = `${resource.panelType}:${item.id}`
  // Editor or reader (the server says: docs/plans/34). Only the owner has Private / Public and the ⋯ menu's actions; the others have
  // Save where Private / Public is
  const role = useArticleRole(item)
  const canEdit = role === 'editor'
  const isOwner = ((item.access as ItemAccess | undefined) ?? 'owner') === 'owner'
  const articleId = Number(item.id)

  // What a click on one of the article's links does (linkExtensions.ts reads it when it happens, so it always sees this render's state)
  const handlers = useRef<LinkHandlers>({ onOpen: () => {}, onFind: () => {}, rules: () => [] })
  // The article's formats and its links: made once, the editor reads them when it opens
  const [extensions] = useState(() => [...articleExtensions, ...linkExtensions(handlers)])
  // The text (docs/plans/36): static until an editor clicks it; everything below reads and changes it through `text`
  const text = useArticleText(autosave.start.version, autosave.start.values.content, extensions, canEdit)
  useLayoutEffect(() => {
    text.onChange = (html) => field('content', html)
  })
  const editor = useTextEditor(text)
  const images = useImagePicker(() => text.editor, (file) => upload(file), (error) => onUploadError(error))
  /** Adds a section of a kind (Add section's menu): at the caret, or at the end of the text when it was not opened yet */
  const addSection = (type: SectionType) => {
    const context = { pickImage: images.open }
    if (editor) placeSection(editor, type, context)
    else void text.open('end').then((ed) => ed && placeSection(ed, type, context))
  }
  const closeMention = () => {
    if (editor) closeTypeTrigger(editor, '@')
    setMention(null)
    setLinkPopout(null)
  }
  const [saved, setSaved] = useSaved(panelKey)
  // The left column's elements the round buttons opened, the zoom, and whether the page is too narrow to have the column beside it
  // (Contents starts open when the page is wide enough to have it beside the article)
  const [side, setSide] = useState<Set<SidePart>>(() => new Set(window.innerWidth >= SIDE_MIN_WIDTH ? ['contents'] : []))
  const [zoomed, setZoomed] = useState(false)
  const [page, setPage] = useState<HTMLDivElement | null>(null)
  const narrow = useNarrower(page, SIDE_MIN_WIDTH)
  const messages = useMessages(text)
  const { ids: noteIds } = useArticleNotes(String(item.id))
  const toggleSide = (part: SidePart) => {
    const next = new Set(side)
    if (next.has(part)) next.delete(part)
    else next.add(part)
    setSide(next)
  }

  /** Opens a message beside the text, level with its words (`el`: the link's element, found from the text when not given) */
  const openMessage = (range: LinkRange, el?: HTMLElement | null, hover = false) => {
    if (range.link.kind !== 'msg') return
    const box = textBox.current?.getBoundingClientRect()
    // The words' last line: the element's own rect, or where the words end in the text
    const end = el?.getBoundingClientRect() ?? text.rectAt(range.to - 1)
    const start = el?.getBoundingClientRect() ?? text.rectAt(range.from + 1)
    const top = (start?.top ?? 0) - (box?.top ?? 0)
    const anchor = end && box ? { x: ('right' in end ? end.right : end.left) - box.left, y: (end.top + end.bottom) / 2 - box.top } : undefined
    setMessage({ id: range.link.id, legacy: range.link.legacy, from: range.from, to: range.to, top: Math.max(0, top), anchor, hover })
  }

  /** The pointer rests on a message's words (`el`), or has left them (null): its panel opens, and closes shortly after the pointer left both */
  const hoverMessage = (el: HTMLElement | null) => {
    if (!el) return laterClose(() => setMessage((open) => (open?.hover ? null : open)), 250)
    cancelClose()
    const pos = text.posAtDom(el, 0)
    const range = pos === null ? null : linkAt(text.doc(), pos + 1)
    if (range) openMessage(range, el, true)
  }

  // Autolinkers already in the text (an article made before the field) are added to the field once, when an editor opens the article
  const adopted = useRef(false)
  useEffect(() => {
    if (!canEdit || adopted.current || !session) return
    adopted.current = true
    const next = adoptRules(rules.list, text.doc(), session.user.id)
    if (next !== rules.list) setRules(next)
    // Once, when the session is there
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, canEdit, session])

  // Old messages become messages when an editor opens the article; what was read of its messages is forgotten when the page closes
  useLegacyMessages(text, articleId, canEdit, autosave.flush)
  useEffect(() => () => forgetArticleMessages(articleId), [articleId])

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

  useEffect(() => {
    handlers.current = {
      onOpen: (link) => {
        if (link.kind === 'url' || link.kind === 'project-url') window.open(link.url, '_blank', 'noopener,noreferrer')
        else if (link.kind === 'object') workspace.open({ type: link.type, id: link.id })
        else if (link.kind === 'person') setPerson(personById(link.personId))
        else if (link.kind === 'jump') {
          const target = resolveJump(text.doc(), link.to)
          if (target) text.goTo(target.kind === 'heading' ? target.from + 1 : target.from, target.kind === 'heading' ? target.end - 1 : target.end)
        }
      },
      onFind: () => setFinding(true),
      rules: () => rules.list,
    }
  })
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
      {/* The owner's Private / Public is in the ⋯ menu; the others have Save here */}
      {!isOwner && <SaveButton panelKey={panelKey} />}
      {/* Only a public article can be shared */}
      {item.visibility === 'public' && (
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
          [
            // About editing the article (not the Info box)
            { label: 'Info', icon: LuInfo, onClick: () => setEditInfo(true) },
            // Who can see it (the owner's): its panel opens beside the menu
            ...(isOwner
              ? [
                  {
                    label: privacy.visibility === 'public' ? 'Public' : 'Private',
                    icon: privacy.visibility === 'public' ? LuLockOpen : LuLock,
                    onClick: () => {},
                    panel: <PrivacyPanel sharing={privacy} what="article" />,
                  },
                ]
              : []),
            { label: 'Search in article', icon: LuSearch, onClick: () => setFinding(true) },
            // The owner's Save (the others have it by the title)
            ...(isOwner ? [{ label: saved ? 'Saved' : 'Save', icon: LuBookmark, checked: saved, onClick: () => setSaved(!saved) }] : []),
          ],
          // Pin, move, Trash, delete: the owner's
          ...(isOwner
            ? menuOf({
                id: item.id,
                title: name,
                pinned: resource.ui.row.pinned?.(item),
              })
            : []),
        ]}
      />
    </div>
  )

  // The left column: Contents (beside the article on a wide page; on a narrow one only when its round button opened it), then Messages and Notes
  const showContents = side.has('contents')
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
      {showContents && <ContentsTree text={text} />}
      {side.has('messages') && (
        <MessagesList
          text={text}
          editor={editor}
          articleId={articleId}
          canEdit={canEdit}
          onOpen={(range) => {
            text.goTo(range.from, range.to)
            openMessage(range)
          }}
          onEdit={(range) => void text.open({ from: range.from, to: range.to }).then(() => setLinkPopout('msg'))}
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
        onField={field}
        readOnly={!canEdit}
        focusField={focusField}
        text={text}
        editor={editor}
        onUploadImage={upload}
        onUploadError={onUploadError}
        extensions={extensions}
        onLinkClick={(link, range, el) => handlers.current.onOpen(link, range, el)}
        onFind={() => setFinding(true)}
        onMention={setMention}
        onSection={addSection}
        textBox={textBox}
        textExtras={
          <>
            <LinkHoverCard text={text} onMessage={hoverMessage} />
            <JumpGutter text={text} box={textBox} />
            {canEdit && <SectionHandles text={text} box={textBox} />}
            {images.input}
            {/* `@` typed: the links row over the text, above the caret's row; a link picked is written at the `@` */}
            {mention && editor && (
              <FloatingAt anchor={mention.rect} side="above" label="Links" onDismiss={closeMention} className="w-[min(44rem,calc(100vw-2rem))]">
                <LinkRow
                  editor={editor}
                  text={text}
                  self={`${resource.panelType}:${item.id}`}
                  articleId={articleId}
                  expanded
                  placement="floating"
                  onClose={closeMention}
                  insertAt={{ from: mention.from, to: mention.to }}
                  open={linkPopout}
                  onOpenChange={setLinkPopout}
                  rules={rules.list}
                  onRules={setRules}
                  userId={session?.user.id ?? ''}
                />
              </FloatingAt>
            )}
            {message && (
              // (the pointer on the panel keeps it open while it was opened by hovering; once something in it has the focus, a reply being
              // written, it stays open as if clicked)
              <div
                className="contents"
                data-message-panel
                onPointerEnter={cancelClose}
                onPointerLeave={() => message.hover && hoverMessage(null)}
                onFocus={() => message.hover && setMessage({ ...message, hover: false })}
              >
                <MessagePanel
                  key={`${message.id}:${message.from}`}
                  id={message.id}
                  legacy={message.legacy}
                  articleId={articleId}
                  canEditArticle={canEdit}
                  top={message.top}
                  anchor={message.anchor}
                  onClose={() => setMessage(null)}
                  onEdit={() =>
                    void text.open({ from: message.from, to: message.to }).then(() => {
                      setMessage(null)
                      setLinkPopout('msg')
                    })
                  }
                  onRemoveLink={() =>
                    void text.open({ from: message.from, to: message.to }).then((ed) => {
                      if (ed) removeArticleLink(ed)
                      setMessage(null)
                    })
                  }
                />
              </div>
            )}
          </>
        }
        leftTools={
          <RoundTools
            zoomed={zoomed}
            onZoom={() => setZoomed(!zoomed)}
            open={side}
            onToggle={toggleSide}
            messages={messages.length}
            notes={noteIds.length}
          />
        }
        actions={actions}
        infoShown={infoShown}
        // Where it is in its owner's projects: theirs only
        folders={isOwner ? <ProjectFolders resource={resource} item={item} /> : null}
        toolbar={
          // Always there for an editor (its buttons wait for the text to be opened), so opening the text never pushes it down
          <div className="sticky top-0 z-20 flex flex-col gap-1 bg-surface py-1 empty:hidden">
            {canEdit && (
              <ArticleToolbar
                editor={editor}
                onUploadImage={upload}
                onUploadError={onUploadError}
                secondRow={rowsOpen}
                onSecondRowChange={setRowsOpen}
                onSection={addSection}
                linkTypes={{ shown: linkTypesShown, onToggle: () => setLinkTypesShown(!linkTypesShown) }}
                // Under the bar (while words are selected, or Link types is pressed), unless it floats at an `@`
                linkRow={
                  !mention && (
                    <LinkRow
                      editor={editor}
                      text={text}
                      self={`${resource.panelType}:${item.id}`}
                      articleId={articleId}
                      expanded={linkTypesShown}
                      open={linkPopout}
                      onOpenChange={setLinkPopout}
                      rules={rules.list}
                      onRules={setRules}
                      userId={session?.user.id ?? ''}
                    />
                  )
                }
              />
            )}
            {finding && <FindBar text={text} onClose={() => setFinding(false)} />}
            {uploadError && (
              <p role="alert" className="text-small text-danger">
                {uploadError}
              </p>
            )}
          </div>
        }
        // Below the text, in every view (docs/plans/37): read when scrolled to
        comments={<CommentsSection articleId={articleId} />}
        footer={
          <div className="flex flex-col gap-1">
            {autosave.lost && (
              <p role="alert" className="text-small text-danger">
                You can no longer edit this article (it was deleted, or your access changed). Your changes are kept on this device.
              </p>
            )}
            <div className="flex items-center gap-2">
              {canEdit && <SaveStatus status={autosave.status} />}
              <span className="ms-auto text-small text-fg-subtle">Created {DATE.format(new Date(item.createdAt))}</span>
            </div>
          </div>
        }
      />
      {dialogs}
      <Modal open={editInfo} onClose={() => setEditInfo(false)} title="Editing this article" size="sm">
        <p className="text-body">Select some words to make them a link, a message or an autolinker, or to change how they look. Your changes are saved as you write.</p>
      </Modal>
      <Modal open={!!person} onClose={() => setPerson(null)} title={person?.name ?? 'Person'} size="sm">
        {person && <PersonCard person={person} />}
      </Modal>
      {autosave.conflict && <ItemConflictModal what={resource.ui.label.toLowerCase()} conflict={autosave.conflict} onKeepMine={autosave.keepMine} onUseServers={autosave.useServers} />}
      </div>
    </div>
  )
}

type BodyProps = {
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
function ArticleBody({
  resource,
  start,
  onField,
  readOnly,
  focusField,
  text,
  editor,
  onUploadImage,
  onUploadError,
  extensions,
  onLinkClick,
  onFind,
  onMention,
  onSection,
  textBox,
  textExtras,
  leftTools,
  actions,
  infoShown,
  folders,
  toolbar,
  comments,
  footer,
}: BodyProps) {
  const [title, setTitle] = useState(start.title ?? '')
  const [infobox, setInfobox] = useState<Infobox>(() => JSON.parse(start.infobox ?? 'null') ?? EMPTY_INFOBOX)
  const change = onField
  const fields = Object.fromEntries(resource.ui.fields.map((f) => [f.name, f]))
  // The cursor is in the text's last row (its last section, wherever the editor's window is)
  const inLastRow =
    useEditorState({
      editor,
      selector: ({ editor: e }) => !!e && e.isFocused && text.sectionAt(text.fromEditor(e.state.selection.from)) === text.doc().childCount - 1,
    }) ?? false
  const [adding, setAdding] = useState(false)

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
            readOnly={readOnly}
          />
          {/* The folder buttons sit on the border between the banner and the body, half over each */}
          <div className="relative z-10 -mt-3.5 px-4 pb-1 empty:hidden">{folders}</div>
          {/* An editor's page has room at the left for the sections' ⠿ */}
          <div className={`relative flex flex-1 flex-col gap-2 p-4 pt-1 ${readOnly ? '' : 'ps-11'}`}>
            <div className="flex items-center gap-3">
              <TitleInput
                size="xl"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  change('title', e.target.value)
                }}
                placeholder={readOnly ? 'Untitled article' : (fields.title?.placeholder ?? 'Title')}
                aria-label="Title"
                maxLength={200}
                readOnly={readOnly}
                autoFocus={!readOnly && (focusField === 'title' || (focusField === undefined && !start.title))}
                className="min-w-0 flex-1"
              />
              <div className="shrink-0">{actions}</div>
            </div>
            {toolbar}
            {/* The Info box floats at the text's top right so the text flows around it, like an encyclopedia's; it is not part of the text (saved in `infobox`) */}
            <div ref={textBox} className="relative flow-root">
              {infoShown && !(readOnly && isEmptyInfobox(infobox)) && (
                <aside className="relative z-10 float-right mb-3 ms-4 w-[clamp(10rem,30%,16rem)]" aria-label="About this article">
                  <InfoBox
                    value={infobox}
                    onChange={(next) => {
                      setInfobox(next)
                      change('infobox', JSON.stringify(next))
                    }}
                    onUploadImage={onUploadImage}
                    onUploadError={onUploadError}
                    readOnly={readOnly}
                  />
                </aside>
              )}
              <ArticleText
                text={text}
                extensions={extensions}
                label={fields.content?.label ?? 'Text'}
                placeholder={readOnly ? undefined : fields.content?.placeholder}
                autoFocus={!readOnly && focusField === 'content'}
                onUploadImage={onUploadImage}
                onUploadError={onUploadError}
                onLinkClick={onLinkClick}
                onFind={onFind}
                onMention={onMention}
              />
              {textExtras}
            </div>
            {/* Under the last row, only while the cursor is in it */}
            {(editor && inLastRow) || adding ? (
              <div className="relative">
                <BarPopover
                  label="Add section"
                  open={adding}
                  onOpenChange={setAdding}
                  trigger={
                    <Button variant="ghost" size="sm" plain filled icon={LuPlus} aria-expanded={adding} onMouseDown={(e) => e.preventDefault()} onClick={() => setAdding(!adding)}>
                      Add section
                    </Button>
                  }
                >
                  <SectionPicker
                    onPick={(type) => {
                      setAdding(false)
                      onSection(type)
                    }}
                  />
                </BarPopover>
              </div>
            ) : null}
            <div className="mt-4">{comments}</div>
            <div className="mt-auto">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
