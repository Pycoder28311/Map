import { EMPTY_INFOBOX, type Infobox } from '@map/shared'
import type { Editor } from '@tiptap/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LuInfo, LuPlus, LuShare2 } from 'react-icons/lu'
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
import TreeMenu from '../../components/ui/tree/TreeMenu'
import { uploadImage } from '../../lib/api/images'
import { useResourceMenu } from '../../lib/resource/actions'
import { valuesOf, type FormValues } from '../../lib/resource/changed'
import { dropFocus, isNewId, peekFocus } from '../../lib/resource/newItem'
import { resourceByName } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import ShareOptions from '../share/ShareOptions'
import type { PanelProps } from '../workspace/types'
import ArticleBreadcrumbs from './ArticleBreadcrumbs'
import ArticleToolbar from './ArticleToolbar'
import InfoBox from './InfoBox'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
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
const articleValues = (resource: AnyResource) => (item: Record<string, unknown>): FormValues => ({
  ...valuesOf(resource, item),
  infobox: JSON.stringify(item.infobox ?? EMPTY_INFOBOX),
})
const articlePatch = (changed: FormValues): Record<string, unknown> =>
  changed.infobox === undefined ? changed : { ...changed, infobox: JSON.parse(changed.infobox) as Infobox }

/**
 * An article's page (the articles' panel, resources.config.ts): breadcrumbs of its parents, the toolbar, its title and text, an
 * Add section bar, and beside them Info / Share / ⋯ and its Info box. Saved as it is edited, like every item (useItemAutosave).
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
  const autosave = useItemAutosave(resource, item, { values: articleValues(resource), toPatch: articlePatch })
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
      <Button
        variant={infoShown ? 'selected' : 'ghost'}
        size="sm"
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
          <Button variant="secondary" size="sm" icon={LuShare2} aria-expanded={sharing} onClick={() => setSharing(!sharing)}>
            Share
          </Button>
        }
      >
        <ShareOptions id={`${resource.panelType}:${item.id}`} />
      </BarPopover>
      <TreeMenu label={`More: ${name}`} groups={menuOf({ id: item.id, title: name, pinned: resource.ui.row.pinned?.(item) })} />
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-3 pb-24">
      <ArticleBreadcrumbs resource={resource} item={item} />
      <div className="sticky top-0 z-10 pt-1">
        <ArticleToolbar editor={editor} onUploadImage={upload} onUploadError={onUploadError} />
      </div>
      {uploadError && (
        <p role="alert" className="text-small text-danger">
          {uploadError}
        </p>
      )}
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
  /** Info / Share / ⋯, above the Info box */
  actions: ReactNode
  infoShown: boolean
  /** Under the text (the save status) */
  footer: ReactNode
}

/** The title, the text and Add section; beside them the actions and the Info box (above the text in a narrow pane) */
function ArticleBody({ resource, start, onChange, focusField, editor, onEditor, onUploadImage, onUploadError, actions, infoShown, footer }: BodyProps) {
  // The latest values, so quick changes of different fields all stay
  const latest = useRef(start)
  const [title, setTitle] = useState(start.title ?? '')
  const [infobox, setInfobox] = useState<Infobox>(() => JSON.parse(start.infobox ?? 'null') ?? EMPTY_INFOBOX)
  const change = (name: string, value: string) => {
    latest.current = { ...latest.current, [name]: value }
    onChange(latest.current)
  }
  const fields = Object.fromEntries(resource.ui.fields.map((f) => [f.name, f]))

  return (
    <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex min-w-0 flex-col gap-3">
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
        />
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
        <Button variant="secondary" icon={LuPlus} disabled={!editor} onClick={() => editor && addSection(editor)} className="w-full justify-center">
          Add section
        </Button>
        {footer}
      </div>
      <aside className="order-first flex flex-col gap-2 @3xl:order-none" aria-label="About this article">
        {actions}
        {infoShown && (
          <InfoBox
            value={infobox}
            onChange={(next) => {
              setInfobox(next)
              change('infobox', JSON.stringify(next))
            }}
            onUploadImage={onUploadImage}
            onUploadError={onUploadError}
          />
        )}
      </aside>
    </div>
  )
}
