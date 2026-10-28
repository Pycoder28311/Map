import { useEditorState, type Editor } from '@tiptap/react'
import { DOMParser as PMDOMParser, type Node as PMNode } from '@tiptap/pm/model'
import { useState, type ReactNode } from 'react'
import { LuCheck, LuDownload, LuExternalLink, LuLocateFixed, LuPencil, LuTrash2, LuWandSparkles, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import CheckField from '../../../components/ui/fields/CheckField'
import InputBox from '../../../components/ui/fields/InputBox'
import TextField from '../../../components/ui/fields/TextField'
import { FIELD_INPUT } from '../../../components/ui/fields/fieldStyles'
import Modal from '../../../components/ui/overlays/Modal'
import { resourceByName } from '../../../resources/registry'
import { fold } from '../../search/search'
import { applyRule, removeRule, ruleRanges, rulesFrom, type AutoRule } from './autolink'
import FollowPicker from './FollowPicker'
import JumpPicker from './JumpPicker'
import { goTo, LINK_EDIT } from './linkExtensions'
import { isWebUrl, LIMITS, newId, type ArticleLink } from './linkHref'
import { LinkTargetName } from './LinkPreview'
import ObjectPicker from './ObjectPicker'

type Props = {
  editor: Editor
  /** The article itself (`article:<id>`): not offered as a target, nor to import from */
  self: string
  /** The words the big input starts with (the selection) */
  startText: string
}

const sameText = (a: string, b: string) => fold(a.trim()) === fold(b.trim())

/** One kind's modal in the joined row: its name over its picker, at least 14rem, sharing the panel's width with the others */
function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-56 flex-1 flex-col gap-2 p-2">
      <h3 className="text-small font-medium text-fg-muted">{title}</h3>
      {children}
    </section>
  )
}

/** Real link's column: an address to choose */
function UrlColumn({ chosen, onPick }: { chosen: ArticleLink | null; onPick: (link: ArticleLink) => void }) {
  const [url, setUrl] = useState(chosen?.kind === 'url' ? chosen.url : '')
  const full = /^[a-z][a-z0-9+.-]*:/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
  const valid = url.trim() !== '' && isWebUrl(full)
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onPick({ kind: 'url', url: full })
      }}
    >
      <TextField label="Link" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={LIMITS.url} />
      <Button type="submit" variant={chosen?.kind === 'url' && chosen.url === full ? 'selected' : 'ghost'} size="sm" icon={LuExternalLink} disabled={!valid} className="self-start">
        Use this link
      </Button>
    </form>
  )
}

/**
 * The Autolinker: one big input with the words to link on top, and under it the four kinds of link joined side by side, in the order of
 * their buttons (Link, Attach Content, Jump link, Follow; never Message). Apply links every place the words are written, and keeps linking them as they are typed
 * (linkExtensions.ts). Under it the autolinkers of this article, two in a row, each with Go there, Edit and Delete, and Import from another
 * article. An autolinker lives only in the links it made (autolink.ts)
 */
export default function AutolinkPanel({ editor, self, startText }: Props) {
  const [text, setText] = useState(startText.slice(0, LIMITS.ruleText))
  const [target, setTarget] = useState<ArticleLink | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  // Which place Go there showed last, for each autolinker
  const [visited, setVisited] = useState<Record<string, number>>({})
  // A new target: the columns start on it (they read it once)
  const [version, setVersion] = useState(0)
  const rules = useEditorState({ editor, selector: ({ editor: e }) => rulesFrom(e.state.doc), equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) })

  const reset = () => {
    setText('')
    setTarget(null)
    setEditing(null)
    setVersion((v) => v + 1)
  }

  const apply = () => {
    const words = text.trim()
    if (!words || !target) return
    const duplicate = rules.find((r) => r.id !== editing && sameText(r.text, words))
    if (duplicate) return setNotice(`“${duplicate.text}” already has an autolinker: edit that one.`)
    const id = editing ?? newId()
    const tr = editor.state.tr
    if (editing) removeRule(tr, editing)
    const count = applyRule(tr, { id, text: words, link: target })
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    setNotice(count === 0 ? `“${words}” is not written anywhere in the article yet, so nothing was linked (an autolinker is kept in its links).` : `Linked ${count} ${count === 1 ? 'place' : 'places'}.`)
    reset()
  }

  const edit = (rule: AutoRule) => {
    setEditing(rule.id)
    setText(rule.text)
    setTarget(rule.link)
    setNotice(null)
    setVersion((v) => v + 1)
  }

  const remove = (rule: AutoRule) => {
    const tr = editor.state.tr
    removeRule(tr, rule.id)
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    if (editing === rule.id) reset()
    setNotice(`“${rule.text}” is not linked any more.`)
  }

  const goThere = (rule: AutoRule) => {
    const places = ruleRanges(editor.state.doc, rule.id)
    if (places.length === 0) return
    const next = ((visited[rule.id] ?? -1) + 1) % places.length
    setVisited({ ...visited, [rule.id]: next })
    goTo(editor, places[next].from, places[next].to)
  }

  const pick = (link: ArticleLink) => {
    setTarget(link)
    setNotice(null)
  }

  return (
    <div className="@container flex flex-col gap-2">
      {/* The words to link: one big input for all the kinds */}
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <InputBox className="h-12! text-heading">
          <LuWandSparkles className="size-5 shrink-0 text-fg-subtle" />
          <input
            aria-label="Words to link"
            placeholder="The words to link everywhere they are written…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={LIMITS.ruleText}
            className={`${FIELD_INPUT} text-heading`}
            autoFocus
          />
        </InputBox>
      </form>

      {/* Under the input, the four kinds' modals joined side by side in one row, in the order of their buttons (LinkRow.tsx): one box, a line
          between them. Never stacked: when the row is wider than the panel it scrolls sideways */}
      <div key={version} className="flex flex-row divide-x divide-line overflow-x-auto rounded-(--card-radius) border border-line">
        <Column title="Link">
          <UrlColumn chosen={target} onPick={pick} />
        </Column>
        <Column title="Attach Content">
          <ObjectPicker exclude={self} chosen={target?.kind === 'object' ? target : null} onPick={(hit) => pick({ kind: 'object', type: hit.type, id: hit.id })} listHeight="max-h-48" autoFocus={false} />
        </Column>
        <Column title="Jump link">
          <JumpPicker editor={editor} chosen={target?.kind === 'jump' ? target.to : null} onPick={(to) => pick({ kind: 'jump', to })} autoFocus={false} />
        </Column>
        <Column title="Follow">
          <FollowPicker chosen={target} onPick={pick} autoFocus={false} />
        </Column>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small text-fg-muted">{text.trim() ? `“${text.trim()}”` : 'No words yet'} →</span>
        {target ? <LinkTargetName link={target} editor={editor} /> : <span className="text-small text-fg-subtle">choose where it links</span>}
        <div className="ms-auto flex gap-2">
          {editing && (
            <Button variant="ghost" size="sm" icon={LuX} onClick={reset}>
              Cancel
            </Button>
          )}
          <Button size="sm" icon={LuCheck} disabled={!text.trim() || !target} onClick={apply}>
            {editing ? 'Save autolinker' : 'Apply'}
          </Button>
        </div>
      </div>
      {notice && (
        <p role="status" className="text-small text-fg-muted">
          {notice}
        </p>
      )}

      {/* The article's autolinkers, two in a row */}
      <div className="flex items-center gap-2 border-t border-line pt-2">
        <h3 className="text-small font-medium text-fg-muted">Autolinkers ({rules.length})</h3>
        <Button variant="ghost" size="sm" icon={LuDownload} className="ms-auto" onClick={() => setImporting(true)}>
          Import from other articles
        </Button>
      </div>
      {rules.length === 0 ? (
        <p className="text-small text-fg-subtle">None yet. Write the words above, choose where they link and Apply.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
          {rules.map((rule) => (
            <li key={rule.id} className={`flex min-w-0 items-center gap-1 rounded-(--card-radius) border p-2 ${editing === rule.id ? 'border-accent' : 'border-line'}`}>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">{rule.text}</span>
                <LinkTargetName link={rule.link} editor={editor} />
                <span className="text-small text-fg-subtle">
                  {rule.count} {rule.count === 1 ? 'place' : 'places'}
                  {visited[rule.id] !== undefined && ` · at ${visited[rule.id] + 1} / ${rule.count}`}
                </span>
              </div>
              <IconButton icon={LuLocateFixed} label={`Go there: ${rule.text}`} size="sm" onClick={() => goThere(rule)} />
              <IconButton icon={LuPencil} label={`Edit: ${rule.text}`} size="sm" variant={editing === rule.id ? 'selected' : 'ghost'} onClick={() => edit(rule)} />
              <IconButton icon={LuTrash2} label={`Delete: ${rule.text}`} size="sm" onClick={() => remove(rule)} />
            </li>
          ))}
        </ul>
      )}
      {importing && <ImportModal editor={editor} self={self} rules={rules} onClose={() => setImporting(false)} onDone={setNotice} />}
    </div>
  )
}

/** Import: pick another article, then which of its autolinkers to use here (jumps stay there: their places are in that article) */
function ImportModal({ editor, self, rules, onClose, onDone }: { editor: Editor; self: string; rules: AutoRule[]; onClose: () => void; onDone: (notice: string) => void }) {
  const [from, setFrom] = useState<{ title: string; rules: AutoRule[] } | null>(null)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [state, setState] = useState<'pick' | 'loading' | 'error'>('pick')
  const here = (rule: AutoRule) => rules.some((r) => sameText(r.text, rule.text))

  const open = async (id: string, title: string) => {
    const articles = resourceByName('articles')
    if (!articles) return
    setState('loading')
    try {
      const article = (await articles.api.get(id)) as { content?: string }
      const doc = parse(editor, article.content ?? '')
      const found = rulesFrom(doc).filter((r) => r.link.kind !== 'jump')
      setFrom({ title, rules: found })
      setTicked(new Set(found.filter((r) => !here(r)).map((r) => r.id)))
      setState('pick')
    } catch {
      setState('error')
    }
  }

  const importTicked = () => {
    if (!from) return
    const tr = editor.state.tr
    let linked = 0
    let unused = 0
    for (const rule of from.rules) {
      if (!ticked.has(rule.id) || here(rule)) continue
      const count = applyRule(tr, { id: newId(), text: rule.text, link: rule.link })
      if (count) linked += count
      else unused++
    }
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    onDone(`Linked ${linked} ${linked === 1 ? 'place' : 'places'}.${unused ? ` ${unused} of the autolinkers had no words written here and were not kept.` : ''}`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={from ? `Autolinkers of “${from.title}”` : 'Import autolinkers from an article'}
      footer={
        from && (
          <>
            <Button variant="ghost" onClick={() => setFrom(null)}>
              Another article
            </Button>
            <Button disabled={ticked.size === 0} onClick={importTicked}>
              Import
            </Button>
          </>
        )
      }
    >
      {state === 'loading' ? (
        <p className="text-body text-fg-subtle">Loading…</p>
      ) : state === 'error' ? (
        <p className="text-body text-danger">The article could not be read.</p>
      ) : from ? (
        from.rules.length === 0 ? (
          <p className="text-body text-fg-subtle">That article has no autolinkers to import.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {from.rules.map((rule) => (
              <li key={rule.id} className="flex items-center gap-2">
                <CheckField
                  label={<span className="font-medium">{rule.text}</span>}
                  checked={ticked.has(rule.id) && !here(rule)}
                  disabled={here(rule)}
                  onChange={(on) => {
                    const next = new Set(ticked)
                    if (on) next.add(rule.id)
                    else next.delete(rule.id)
                    setTicked(next)
                  }}
                />
                <LinkTargetName link={rule.link} editor={null} />
                {here(rule) && <span className="ms-auto text-small text-fg-subtle">already here</span>}
              </li>
            ))}
          </ul>
        )
      ) : (
        <ObjectPicker only={['article']} exclude={self} onPick={(hit) => void open(hit.id, hit.title)} />
      )}
    </Modal>
  )
}

/** Another article's text as a document of this editor's kind (to read its links) */
function parse(editor: Editor, html: string): PMNode {
  const body = new window.DOMParser().parseFromString(html, 'text/html').body
  return PMDOMParser.fromSchema(editor.schema).parse(body)
}
