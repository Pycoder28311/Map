import { EMPTY_INFOBOX, type Infobox } from '@map/shared'
import { useEditorState, type Editor } from '@tiptap/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LuEllipsis, LuInfo, LuPlus, LuShare2 } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { addSection, articleExtensions } from '../../components/ui/editors/articleExtensions'
import RichTextField from '../../components/ui/fields/RichTextField'
import TitleInput from '../../components/ui/fields/TitleInput'
import BarPopover from '../../components/ui/overlays/BarPopover'
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
import ShareOptions from '../share/ShareOptions'
import type { PanelProps } from '../workspace/types'
import ArticleBanner from './ArticleBanner'
import ArticleToolbar from './ArticleToolbar'
import InfoBox from './InfoBox'
import ProjectFolders from './ProjectFolders'

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
  const [editor, setEditor] = useState<Editor | null>(null)
  const [infoShown, setInfoShown] = useState(readInfoShown)
  const [sharing, setSharing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
      <Button
        variant={infoShown ? 'selected' : 'ghost'}
        size="sm"
        plain
        icon={LuInfo}
        aria-pressed={infoShown}
        onClick={() => {
          setInfoShown(!infoShown)
          writeInfoShown(!infoShown)
        }}
      >
        Info
      </Button>
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
      <IconMenu
        label={`More: ${name}`}
        icon={LuEllipsis}
        turn={false}
        groups={menuOf({
          id: item.id,
          title: name,
          pinned: resource.ui.row.pinned?.(item),
        })}
      />
    </div>
  )

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-3 px-4 pb-4">
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
        actions={actions}
        infoShown={infoShown}
        folders={<ProjectFolders resource={resource} item={item} />}
        toolbar={
          <div className="sticky top-0 z-20 flex flex-col gap-1 bg-surface py-1">
            <ArticleToolbar editor={editor} onUploadImage={upload} onUploadError={onUploadError} />
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
      {autosave.conflict && <ItemConflictModal what={resource.ui.label.toLowerCase()} onKeepMine={autosave.keepMine} onUseServers={autosave.useServers} />}
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
    <div className="flex flex-1 flex-col">
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
            <div className="flow-root">
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
                extensions={articleExtensions}
                onEditor={onEditor}
                onUploadImage={onUploadImage}
                onUploadError={onUploadError}
                autoFocus={focusField === 'content'}
                minHeight="min-h-[40vh]"
              />
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
