import type { ItemAccess, Visibility } from '@map/shared'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { articleExtensions } from '../../../components/ui/editors/articleExtensions'
import { closeTypeTrigger, type TriggerMatch } from '../../../components/ui/editors/typeTrigger'
import { useImagePicker } from '../../../components/ui/editors/useImagePicker'
import FloatingAt from '../../../components/ui/overlays/FloatingAt'
import Modal from '../../../components/ui/overlays/Modal'
import ItemConflictModal from '../../../components/ui/resource/ItemConflictModal'
import { useItemAutosave, type EditedItem } from '../../../components/ui/resource/useItemAutosave'
import { uploadImage } from '../../../lib/api/images'
import { authClient } from '../../../lib/auth-client'
import { useResourceMenu } from '../../../lib/resource/actions'
import { useNarrower } from '../../../lib/useNarrower'
import type { AnyResource } from '../../../resources/types'
import { useAttachedNotes, useMoveLocalNotes } from '../../notes/attachedNotes'
import type { Person } from '../../people/mockPeople'
import PersonCard from '../../people/PersonCard'
import { useSharing } from '../../sharing/sharing'
import CommentsSection from '../comments/CommentsSection'
import FindBar from '../links/FindBar'
import JumpGutter from '../links/JumpGutter'
import { linkExtensions, type LinkHandlers } from '../links/linkExtensions'
import LinkHoverCard from '../links/LinkHoverCard'
import LinkRow, { type LinkPopout } from '../links/LinkRow'
import { forgetArticleMessages } from '../messages/messagesStore'
import { useLegacyMessages } from '../messages/useLegacyMessages'
import { useSaved } from '../save/savedStore'
import { useArticleRole } from '../save/useArticleRole'
import { placeSection, type SectionType } from '../sections/sectionTypes'
import { useMessages } from '../side/MessagesList'
import RoundTools from '../side/RoundTools'
import { useArticleText, useTextEditor } from '../text/articleText'
import SectionHandles from '../text/SectionHandles'
import TableTools from '../text/TableTools'
import ArticleToolbar from '../toolbar/ArticleToolbar'
import ArticleActions from './ArticleActions'
import ArticleBody from './ArticleBody'
import ArticleFooter from './ArticleFooter'
import { articlePatch, articleValues } from './articleValues'
import OpenMessage from './OpenMessage'
import { SIDE_MIN_WIDTH } from './pageConfig'
import ProjectFolders from './ProjectFolders'
import SideColumn from './SideColumn'
import { useAdoptRules, useArticleFields } from './useArticleFields'
import { useLinkHandlers } from './useLinkHandlers'
import { useMessagePanel } from './useMessagePanel'
import { useSidePanel } from './useSidePanel'
import { useZoom } from './useZoom'

/**
 * An article's page (the articles' panel, resources.config.ts): one bordered box: the banner, the folders of its project, the title with Info / Share / ⋯, the toolbar, and the text with the Info box
 * floating at its top right (the text flows around it). Saved as it is edited, like every item (useItemAutosave). Its parts are in this
 * folder; this file holds the page's state and puts them together
 */
export default function ArticlePage({ resource, item, focusField }: { resource: AnyResource; item: EditedItem; focusField?: string }) {
  const autosave = useItemAutosave(resource, item, {
    values: articleValues(resource),
    toPatch: articlePatch,
  })
  const { menuOf, dialogs } = useResourceMenu(resource)
  const { data: session } = authClient.useSession()
  // The values the page saves (a change of one field saves them all) and the article's autolinkers
  const { field, rules, setRules } = useArticleFields(autosave)
  // The Info box always shows (it had a switch in the ⋯ menu once)
  const infoShown = true
  // Who can see the article (its owner's: the ⋯ menu's Private / Public); the people are read only when its panel opens
  const privacy = useSharing('articles', Number(item.id), (item.visibility as Visibility | undefined) ?? 'private')
  const [sharing, setSharing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // The link row's open popout
  const [linkPopout, setLinkPopout] = useState<LinkPopout | null>(null)
  // The toolbar's More: its second row
  const [rowsOpen, setRowsOpen] = useState(true)
  // Link types (row 2): the links row shown under the bar with nothing selected
  const [linkTypesShown, setLinkTypesShown] = useState(false)
  // `@` typed in the text: the links row floats above its row (and is not shown under the bar meanwhile)
  const [mention, setMention] = useState<TriggerMatch | null>(null)
  // Search in article
  const [finding, setFinding] = useState(false)
  // The ⋯ menu's Info: how to edit the article
  const [editInfo, setEditInfo] = useState(false)
  // The person shown (their words were clicked)
  const [person, setPerson] = useState<Person | null>(null)
  // The box around the text: what the message, the hover card and the jump marks are placed in
  const textBox = useRef<HTMLDivElement>(null)
  // The Info box, which the text flows around (a message's card goes right of where the text's lines end)
  const infoAside = useRef<HTMLElement>(null)
  const panelKey = `${resource.panelType}:${item.id}`
  // Editor or reader (the server says: docs/plans/34). Only the owner has Private / Public and the ⋯ menu's actions; the others have
  // Save where Private / Public is
  const role = useArticleRole(item)
  const canEdit = role === 'editor'
  const isOwner = ((item.access as ItemAccess | undefined) ?? 'owner') === 'owner'
  const articleId = Number(item.id)

  // What a click on one of the article's links does (useLinkHandlers writes it after every render)
  const handlers = useRef<LinkHandlers>({ onOpen: () => {}, onFind: () => {}, rules: () => [] })
  // The article's formats and its links: made once, the editor reads them when it opens
  const [extensions] = useState(() => [...articleExtensions, ...linkExtensions(handlers)])
  // The text (docs/plans/36): static until an editor clicks it; everything below reads and changes it through `text`
  const text = useArticleText(autosave.start.version, autosave.start.values.content, extensions, canEdit)
  useLayoutEffect(() => {
    text.onChange = (html) => field('content', html)
  })
  const editor = useTextEditor(text)
  // A picture stored for the text, the banner or the Info box; its error shows under the toolbar
  const onUploadError = (error: unknown) => setUploadError(error instanceof Error ? error.message : 'The picture could not be uploaded.')
  const upload = (file: File) => {
    setUploadError(null)
    return uploadImage(file)
  }
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
  // The left column (Contents, Messages, Notes), and whether the page is too narrow to have it beside the article
  const { side, kept, open, toggleSide } = useSidePanel()
  const [page, setPage] = useState<HTMLDivElement | null>(null)
  const narrow = useNarrower(page, SIDE_MIN_WIDTH)
  const messages = useMessages(text)
  // Its notes (docs/plans/38) are read when the Notes panel first opens; the ones this device connected before are moved to the server once
  const attachedNotes = useAttachedNotes({ type: 'article', id: articleId }, side.has('notes'))
  useMoveLocalNotes('article', articleId)
  // The message open beside the text
  const messagePanel = useMessagePanel(text, textBox, infoAside)

  useAdoptRules(text, canEdit, session?.user.id, rules, setRules)
  // Old messages become messages when an editor opens the article; what was read of its messages is forgotten when the page closes
  useLegacyMessages(text, articleId, canEdit, autosave.flush)
  useEffect(() => () => forgetArticleMessages(articleId), [articleId])
  const [zoomed, setZoomed] = useZoom(page)
  useLinkHandlers(handlers, { text, rules, onPerson: setPerson, onFind: () => setFinding(true) })

  const name = resource.ui.row.title(item)
  // What the two links rows (under the bar, and floating at an `@`) share
  const linkRowProps = { text, self: panelKey, articleId, open: linkPopout, onOpenChange: setLinkPopout, rules, onRules: setRules, userId: session?.user.id ?? '' }

  return (
    <div
      ref={setPage}
      // Zoomed: in the top layer, filling the window (the article in its middle, as on the page)
      popover={zoomed ? 'manual' : undefined}
      className={`relative mx-auto flex w-full justify-center px-4 pb-4 ${zoomed ? 'fixed inset-0 m-0 h-full max-h-none max-w-none overflow-auto border-0 bg-surface-muted pt-0 text-fg' : 'min-h-full max-w-[88rem]'}`}
    >
      <SideColumn
        narrow={narrow}
        open={open}
        kept={kept}
        text={text}
        editor={editor}
        articleId={articleId}
        canEdit={canEdit}
        onOpenMessage={(range) => {
          text.goTo(range.from, range.to)
          messagePanel.openMessage(range)
        }}
        onEditMessage={(range) => void text.open({ from: range.from, to: range.to }).then(() => setLinkPopout('msg'))}
      />
      <div className="flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-3">
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
          infoBox={infoAside}
          textExtras={
            <>
              <LinkHoverCard text={text} onMessage={messagePanel.hoverMessage} />
              <JumpGutter text={text} box={textBox} />
              {canEdit && <SectionHandles text={text} box={textBox} />}
              {canEdit && <TableTools text={text} box={textBox} />}
              {images.input}
              {/* `@` typed: the links row over the text, above the caret's row; a link picked is written at the `@` */}
              {mention && editor && (
                <FloatingAt anchor={mention.rect} side="above" label="Links" onDismiss={closeMention} className="w-[min(44rem,calc(100vw-2rem))]">
                  <LinkRow {...linkRowProps} editor={editor} expanded placement="floating" onClose={closeMention} insertAt={{ from: mention.from, to: mention.to }} />
                </FloatingAt>
              )}
              <OpenMessage panel={messagePanel} text={text} articleId={articleId} canEdit={canEdit} onEditLink={() => setLinkPopout('msg')} />
            </>
          }
          leftTools={<RoundTools zoomed={zoomed} onZoom={() => setZoomed(!zoomed)} open={side} onToggle={toggleSide} messages={messages.length} notes={attachedNotes.items.length} />}
          actions={
            <ArticleActions
              name={name}
              panelKey={panelKey}
              isPublic={item.visibility === 'public'}
              isOwner={isOwner}
              sharing={sharing}
              onSharing={setSharing}
              privacy={privacy}
              saved={saved}
              onSaved={setSaved}
              onInfo={() => setEditInfo(true)}
              onFind={() => setFinding(true)}
              // Pin, move, Trash, delete: the owner's
              itemMenu={isOwner ? menuOf({ id: item.id, title: name, pinned: resource.ui.row.pinned?.(item) }) : []}
            />
          }
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
                  linkRow={!mention && <LinkRow {...linkRowProps} editor={editor} expanded={linkTypesShown} />}
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
          footer={<ArticleFooter autosave={autosave} canEdit={canEdit} createdAt={item.createdAt} />}
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
