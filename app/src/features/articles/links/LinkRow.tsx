import { useEditorState, type Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuCornerDownRight, LuExternalLink, LuFileSymlink, LuMessageSquareText, LuUserPlus, LuWandSparkles } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import BarPopover from '../../../components/ui/overlays/BarPopover'
import { TextButton } from '../ArticleToolbar'
import AutolinkPanel from './AutolinkPanel'
import FollowPicker from './FollowPicker'
import JumpPicker from './JumpPicker'
import { currentLink, LINK_EDIT, removeArticleLink, setArticleLink } from './linkExtensions'
import MessageLinkForm from '../messages/MessageLinkForm'
import { RealLinkForm } from './LinkForms'
import { newId, toHref, type ArticleLink, type LinkKind } from './linkHref'
import ObjectPicker from './ObjectPicker'

/** The popouts of the link row: one per kind of link, and the Autolinker's */
export type LinkPopout = 'url' | 'object' | 'msg' | 'jump' | 'follow' | 'auto'
type Kind = Exclude<LinkPopout, 'auto'>

/** In this order, then the Autolinker. The Autolinker's panel has the same ones, in the same order, but Message */
const BUTTONS: { id: Kind; label: string; icon: PlainIcon; kinds: LinkKind[]; title: string }[] = [
  { id: 'url', label: 'Link', icon: LuExternalLink, kinds: ['url'], title: 'Link to a web page' },
  { id: 'object', label: 'Attach Content', icon: LuFileSymlink, kinds: ['object'], title: 'Link to an article, map, object card, folder or project' },
  { id: 'jump', label: 'Jump link', icon: LuCornerDownRight, kinds: ['jump'], title: 'Jump to a section or a marked place of this article' },
  { id: 'follow', label: 'Follow', icon: LuUserPlus, kinds: ['person', 'project-url'], title: "Send the reader to a person, or to someone's project" },
  { id: 'msg', label: 'Message', icon: LuMessageSquareText, kinds: ['msg'], title: 'A message that opens beside the text' },
]

/** Popouts wider than the default */
const WIDTH: Partial<Record<Kind, string>> = { object: 'w-[28rem]', follow: 'w-96', jump: 'w-80' }

type Props = {
  editor: Editor | null
  /** The article itself (`article:<id>`): not offered as a target */
  self: string
  /** The article's id (its messages are written on it) */
  articleId: number
  /** The toolbar's ⋯ has its rows open: the row shows even with nothing selected */
  expanded: boolean
  /** Which popout is open (the page opens one too: a message's Edit) */
  open: LinkPopout | null
  onOpenChange: (open: LinkPopout | null) => void
}

/**
 * The toolbar's third row, smaller than the other two and centred: Link, Attach Content, Jump link, Follow and Message, then the Autolinker.
 * It shows only while some words are selected, or the toolbar's ⋯ has its rows open (and, so nothing vanishes under the pointer, while
 * one of its popouts is open or a jump's place is being marked). Each makes the selected words a link, written only in the text's HTML (linkHref.ts; a
 * Message also writes the message on the server, and the link keeps its id); on a link of its kind it opens on it,
 * with Remove. The Autolinker joins the other kinds (all but Message) into one panel with one big input (AutolinkPanel)
 */
export default function LinkRow({ editor, self, articleId, expanded, open, onOpenChange }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const { from, to, empty } = e.state.selection
      return { empty, link: currentLink(e), words: e.state.doc.textBetween(from, to, ' ') }
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })
  // Jump link's "Mark a place…": the words that will jump, while the place is being selected
  const [marking, setMarking] = useState<{ from: number; to: number } | null>(null)
  if (!editor || !state) return null
  if (!expanded && state.empty && open === null && marking === null) return null

  const auto = open === 'auto'
  const close = () => onOpenChange(null)
  const current = (id: Kind) => (state.link && BUTTONS.find((b) => b.id === id)!.kinds.includes(state.link.kind) ? state.link : null)
  const toggle = (id: LinkPopout) => {
    // On a link with no selection: the whole link is selected first, so its words show and change together
    if (id !== 'auto' && state.empty && current(id)) editor.chain().extendMarkRange('link').run()
    onOpenChange(open === id ? null : id)
  }
  const apply = (link: ArticleLink, words?: string) => {
    setArticleLink(editor, link, words)
    close()
  }
  const remove = () => {
    removeArticleLink(editor)
    close()
  }

  const startMarking = () => {
    const { from, to } = editor.state.selection
    setMarking({ from, to })
    close()
  }
  const { from, to } = editor.state.selection
  const canMark = !!marking && !state.empty && (to <= marking.from || from >= marking.to)
  const mark = () => {
    if (!marking || !canMark) return
    const type = editor.schema.marks.link
    const id = newId()
    const tr = editor.state.tr
      .addMark(from, to, type.create({ href: toHref({ kind: 'anchor', id }) }))
      .addMark(marking.from, marking.to, type.create({ href: toHref({ kind: 'jump', to: `a:${id}` }) }))
      .setMeta(LINK_EDIT, true)
    editor.view.dispatch(tr)
    setMarking(null)
  }

  const form = (id: Kind) => {
    const link = current(id)
    const onRemove = link ? remove : undefined
    switch (id) {
      case 'url':
        return (
          <RealLinkForm
            url={link?.kind === 'url' ? link.url : ''}
            name={state.words}
            onApply={(url, name) => apply({ kind: 'url', url }, name)}
            onRemove={onRemove}
          />
        )
      case 'object':
        return (
          <div className="flex flex-col gap-2">
            <ObjectPicker
              exclude={self}
              chosen={link?.kind === 'object' ? link : null}
              onPick={(hit) => apply({ kind: 'object', type: hit.type, id: hit.id })}
            />
            {onRemove && (
              <Button variant="ghost" size="sm" className="self-end" onClick={onRemove}>
                Remove
              </Button>
            )}
          </div>
        )
      case 'msg':
        // Opened only while it shows (it reads the message, and keeps the words it was opened on)
        return open === 'msg' && <MessageLinkForm editor={editor} articleId={articleId} link={link?.kind === 'msg' ? link : null} onDone={close} onRemove={onRemove} />
      case 'jump':
        return (
          <JumpPicker
            editor={editor}
            chosen={link?.kind === 'jump' ? link.to : null}
            onPick={(to) => apply({ kind: 'jump', to })}
            onMarkPlace={state.empty ? undefined : startMarking}
            onRemove={onRemove}
          />
        )
      case 'follow':
        return <FollowPicker chosen={link} onPick={(l) => apply(l)} onRemove={onRemove} />
    }
  }

  return (
    // The popouts hang under the whole bar (its full width, centred)
    <div className="relative flex flex-col items-center">
      <div className="inline-flex animate-share-pop max-w-full flex-wrap items-center gap-0.5 rounded-(--card-radius) border border-line bg-surface px-1 py-0.5 shadow-sm">
        {/* The five kinds: joined by a line under them while the Autolinker is open (all but Message, which it can't make) */}
        <div role="group" aria-label="Links" className={`flex flex-wrap items-center gap-0.5 border-b-2 ${auto ? 'border-accent' : 'border-transparent'}`}>
          {BUTTONS.map((b) => {
            const enabled = !state.empty || !!current(b.id)
            const skipped = auto && b.id === 'msg'
            return (
              <BarPopover
                key={b.id}
                label={b.label}
                open={open === b.id}
                onOpenChange={(next) => onOpenChange(next ? b.id : null)}
                width={WIDTH[b.id]}
                align="center"
                trigger={
                  <TextButton
                    icon={b.icon}
                    label={b.label}
                    small
                    active={open === b.id || (auto && !skipped) || !!current(b.id)}
                    disabled={!enabled || skipped}
                    tip={skipped ? 'The Autolinker does not make messages.' : enabled ? b.title : 'Select some words first.'}
                    onClick={() => toggle(b.id)}
                  />
                }
              >
                {form(b.id)}
              </BarPopover>
            )
          })}
        </div>
        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-(--divider-line)" />
        <TextButton
          icon={LuWandSparkles}
          label="Autolinker"
          small
          active={auto}
          tip="Links the words you choose everywhere they are written in the article."
          onClick={() => toggle('auto')}
        />
        {/* Its own modal (AutolinkPanel: the shared one, with no zoom) */}
        {auto && <AutolinkPanel editor={editor} self={self} startText={state.words} onClose={close} />}
      </div>
      {marking && (
        <div
          role="status"
          className="mt-1 inline-flex flex-wrap items-center gap-2 rounded-(--card-radius) border border-accent bg-surface px-2 py-1 text-small shadow-sm"
        >
          <span>Select the place to jump to, then</span>
          <Button size="sm" disabled={!canMark} onMouseDown={(e) => e.preventDefault()} onClick={mark}>
            Mark it
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMarking(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
