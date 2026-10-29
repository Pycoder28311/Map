import { useEditorState, type Editor } from '@tiptap/react'
import { DOMParser as PMDOMParser, type Node as PMNode } from '@tiptap/pm/model'
import { useState, type ReactNode } from 'react'
import { LuCornerDownRight, LuDownload, LuExternalLink, LuFileSymlink, LuPencil, LuPlus, LuSearch, LuTrash2, LuUserPlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import CheckField from '../../../components/ui/fields/CheckField'
import InputBox from '../../../components/ui/fields/InputBox'
import TextField from '../../../components/ui/fields/TextField'
import { FIELD_INPUT } from '../../../components/ui/fields/fieldStyles'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import Modal from '../../../components/ui/overlays/Modal'
import { resourceByName } from '../../../resources/registry'
import { fold } from '../../search/search'
import { useWorkspace } from '../../workspace/useWorkspace'
import { applyRule, longestFirst, removeRule, ruleRanges, rulesFrom, type AutoRule } from './autolink'
import FollowPicker from './FollowPicker'
import JumpPicker from './JumpPicker'
import { goTo, LINK_EDIT } from './linkExtensions'
import { isWebUrl, LIMITS, newId, type ArticleLink } from './linkHref'
import { LinkTargetName, useLinkInfo } from './LinkPreview'
import ObjectPicker from './ObjectPicker'

type Props = {
  editor: Editor
  /** The article itself (`article:<id>`): not offered as a target, nor to import from */
  self: string
  /** The words the first input starts with (the selection): given, the form is open at once */
  startText: string
  /** Closes the Autolinker (Go there and the endpoints leave it, to show the place) */
  onClose: () => void
}

const sameText = (a: string, b: string) => fold(a.trim()) === fold(b.trim())

/** The four kinds of link the sections choose (the order of the link row's buttons, but Message) */
type SectionId = 'url' | 'object' | 'jump' | 'follow'
const SECTIONS: { id: SectionId; label: string; icon: PlainIcon; searchable: boolean }[] = [
  { id: 'url', label: 'Link', icon: LuExternalLink, searchable: false },
  { id: 'object', label: 'Attach Content', icon: LuFileSymlink, searchable: true },
  { id: 'jump', label: 'Jump link', icon: LuCornerDownRight, searchable: true },
  { id: 'follow', label: 'Follow', icon: LuUserPlus, searchable: true },
]

/** Link's section: an address to choose */
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
      <Button type="submit" variant={chosen?.kind === 'url' && chosen.url === full ? 'selected' : 'ghost'} size="sm" plain icon={LuExternalLink} disabled={!valid} className="self-start">
        Use this link
      </Button>
    </form>
  )
}

/** A section: its name with its icon and, at the right of the name, a search button (it opens the search field below it and becomes an X that closes it), then its picker */
function SectionBody({ title, icon: Icon, searchable, children }: { title: string; icon: PlainIcon; searchable: boolean; children: (searchOpen: boolean) => ReactNode }) {
  const [searching, setSearching] = useState(false)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-small font-medium text-fg-muted">
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{title}</span>
        </h3>
        {searchable && (
          <IconButton icon={searching ? LuX : LuSearch} label={searching ? `Close the search of ${title}` : `Search in ${title}`} size="sm" aria-expanded={searching} onClick={() => setSearching(!searching)} />
        )}
      </div>
      {/* (closing it starts the picker again, so its search is empty the next time) */}
      <div key={String(searching)} className="flex min-w-0 flex-col gap-2">
        {children(searching)}
      </div>
    </div>
  )
}

/**
 * "Link: <where it goes>" of a list row. The endpoint is clickable (an address opens in a new tab, an object opens beside the article) except
 * for a Jump link and Follow, which are only named
 */
function Endpoint({ link, editor, onLeave }: { link: ArticleLink; editor: Editor; onLeave: () => void }) {
  const workspace = useWorkspace()
  const info = useLinkInfo(link, editor)
  const text = link.kind === 'url' || link.kind === 'project-url' ? link.url : info.title
  const open =
    link.kind === 'url'
      ? () => window.open(link.url, '_blank', 'noopener,noreferrer')
      : link.kind === 'object'
        ? () => {
            onLeave()
            workspace.open({ type: link.type, id: link.id })
          }
        : null
  return (
    <span className="flex max-w-[45%] min-w-0 shrink-0 items-center gap-1 text-small">
      <span className="shrink-0 text-fg-subtle">Link:</span>
      {open ? (
        <LinkButton onClick={open} className="min-w-0 truncate" title={text}>
          {text}
        </LinkButton>
      ) : (
        <span className="min-w-0 truncate text-fg-muted" title={text}>
          {text}
        </span>
      )}
    </span>
  )
}

/**
 * The Autolinker, in the shared Modal: its header has the title, Import from other article and Add New (primary); Add New (or Edit on a
 * list row) opens the form: a sentence on what it does, the phrase inputs (an X at the right of each; Add autolink under them adds another
 * input), the four kinds of link as four sections side by side, and Save. Under it the article's autolinkers, a
 * row each: "Link: <endpoint>", the phrases as tags (clicking one goes to where it is written), Edit and Delete. All the phrases of one
 * autolinker link to the same place; Save links every place they are written, and they are linked as they are typed (linkExtensions.ts).
 * An autolinker lives only in the links it made (autolink.ts)
 */
export default function AutolinkPanel({ editor, self, startText, onClose }: Props) {
  const [formOpen, setFormOpen] = useState(startText.trim() !== '')
  const [phrases, setPhrases] = useState<string[]>([startText.slice(0, LIMITS.ruleText)])
  const [target, setTarget] = useState<ArticleLink | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  // Which place Go there showed last, for each tag of each autolinker
  const [visited, setVisited] = useState<Record<string, number>>({})
  // A new target: the sections start on it (they read it once)
  const [version, setVersion] = useState(0)
  const rules = useEditorState({ editor, selector: ({ editor: e }) => rulesFrom(e.state.doc), equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }) ?? []

  const words = phrases.map((p) => p.trim()).filter(Boolean)
  const setPhrase = (i: number, text: string) => setPhrases(phrases.map((p, at) => (at === i ? text : p)))
  // The X of an input: takes it away; the last one left is only emptied
  const removePhrase = (i: number) => setPhrases(phrases.length === 1 ? [''] : phrases.filter((_, at) => at !== i))

  /** A fresh form (Add New), or none (after Save or Cancel) */
  const start = (open: boolean, text = '') => {
    setFormOpen(open)
    setPhrases([text])
    setTarget(null)
    setEditing(null)
    setVersion((v) => v + 1)
  }

  const save = () => {
    if (words.length === 0 || !target) return
    // A phrase written twice counts once; one that another autolinker has is that one's
    const unique = words.filter((w, i) => words.findIndex((x) => sameText(x, w)) === i)
    const taken = unique.find((w) => rules.some((r) => r.id !== editing && r.phrases.some((p) => sameText(p, w))))
    if (taken) return setNotice(`“${taken}” already has an autolinker: edit that one.`)
    const id = editing ?? newId()
    const tr = editor.state.tr
    if (editing) removeRule(tr, editing)
    let count = 0
    for (const text of longestFirst(unique)) count += applyRule(tr, { id, text, link: target })
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    setNotice(
      count === 0
        ? `${unique.length === 1 ? 'That phrase is' : 'Those phrases are'} not written anywhere in the article yet, so nothing was linked (an autolinker is kept in its links).`
        : `Linked ${count} ${count === 1 ? 'place' : 'places'}.`,
    )
    start(false)
  }

  const edit = (rule: AutoRule) => {
    start(true)
    setEditing(rule.id)
    setPhrases(rule.phrases)
    setTarget(rule.link)
    setNotice(null)
  }

  const remove = (rule: AutoRule) => {
    const tr = editor.state.tr
    removeRule(tr, rule.id)
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    if (editing === rule.id) start(false)
    setNotice(`“${rule.phrases.join('”, “')}” ${rule.phrases.length === 1 ? 'is' : 'are'} not linked any more.`)
  }

  // The modal covers the text, so it closes first; then the place is shown, the next one each time
  const goThere = (rule: AutoRule, phrase: string) => {
    const places = ruleRanges(editor.state.doc, rule.id).filter((r) => 'rule' in r.link && r.link.rule && sameText(r.link.rule.text, phrase))
    if (places.length === 0) return
    const key = `${rule.id}:${phrase}`
    const next = ((visited[key] ?? -1) + 1) % places.length
    setVisited({ ...visited, [key]: next })
    onClose()
    window.setTimeout(() => goTo(editor, places[next].from, places[next].to), 60)
  }

  const pick = (link: ArticleLink) => {
    setTarget(link)
    setNotice(null)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Autolinker"
      size="xl"
      actions={
        <>
          <Button variant="text" size="sm" icon={LuDownload} onClick={() => setImporting(true)}>
            Import from other article
          </Button>
          <Button size="sm" icon={LuPlus} onClick={() => start(true)}>
            Add New
          </Button>
        </>
      }
    >
      <div className="@container flex flex-col gap-4">
        {formOpen && (
          <div className="flex flex-col gap-3 rounded-(--card-radius) border border-line bg-surface-muted p-3">
            {/* What it does, in big letters */}
            <p className="rounded-(--card-radius) border border-line-strong bg-surface px-3 py-2 text-heading">
              Write the words you want to link, then choose where they go. Every place they are written in the article becomes that link, and so do the ones you write later.
            </p>

            {/* The phrases: an input each, its X at the right (no background until hovered); Add autolink under them adds another input */}
            <div className="flex flex-col gap-2">
              {phrases.map((phrase, i) => (
                <div key={i} className="flex items-center gap-2">
                  <InputBox className="min-w-0 flex-1">
                    <input
                      aria-label={i === 0 ? 'Words to link' : `Link phrase ${i + 1}`}
                      placeholder={i === 0 ? 'The words to link…' : 'Another phrase to link to the same place…'}
                      value={phrase}
                      onChange={(e) => setPhrase(i, e.target.value)}
                      // Enter goes on to the next phrase (a new one after the last)
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        if (i === phrases.length - 1 && phrase.trim()) setPhrases([...phrases, ''])
                      }}
                      maxLength={LIMITS.ruleText}
                      className={FIELD_INPUT}
                      autoFocus={i === phrases.length - 1}
                    />
                  </InputBox>
                  <IconButton icon={LuX} label={phrases.length === 1 ? 'Clear the words' : `Remove phrase ${i + 1}`} size="lg" disabled={phrases.length === 1 && phrase === ''} onClick={() => removePhrase(i)} />
                </div>
              ))}
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" plain icon={LuPlus} onClick={() => setPhrases([...phrases, ''])}>
                  Add autolink
                </Button>
              </div>
            </div>

            {/* The four kinds side by side, in the order of the link row's buttons (one box, a line between them): each with its name and, but Link, a
                search button at the right of the name */}
            <div key={version} className="flex flex-row divide-x divide-line overflow-x-auto rounded-(--card-radius) border border-line bg-surface">
              {SECTIONS.map((s) => (
                <section key={s.id} aria-label={s.label} className="flex min-w-56 flex-1 flex-col p-2">
                  <SectionBody title={s.label} icon={s.icon} searchable={s.searchable}>
                    {(searching) =>
                      s.id === 'url' ? (
                        <UrlColumn chosen={target} onPick={pick} />
                      ) : s.id === 'object' ? (
                        <ObjectPicker
                          exclude={self}
                          chosen={target?.kind === 'object' ? target : null}
                          onPick={(hit) => pick({ kind: 'object', type: hit.type, id: hit.id })}
                          listHeight="max-h-48"
                          autoFocus={searching}
                          showSearch={searching}
                        />
                      ) : s.id === 'jump' ? (
                        <JumpPicker editor={editor} chosen={target?.kind === 'jump' ? target.to : null} onPick={(to) => pick({ kind: 'jump', to })} autoFocus={searching} showSearch={searching} />
                      ) : (
                        <FollowPicker chosen={target} onPick={pick} autoFocus={searching} showSearch={searching} />
                      )
                    }
                  </SectionBody>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-small text-fg-muted">{words.length ? `“${words.join('”, “')}”` : 'No words yet'} →</span>
              {target ? <LinkTargetName link={target} editor={editor} /> : <span className="text-small text-fg-subtle">choose where they link</span>}
              <div className="ms-auto flex gap-2">
                <Button variant="ghost" size="sm" plain onClick={() => start(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={words.length === 0 || !target} onClick={save}>
                  {editing ? 'Save autolinker' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {notice && (
          <p role="status" className="text-small text-fg-muted">
            {notice}
          </p>
        )}

        {/* The article's autolinkers, a row each */}
        {rules.length === 0 ? (
          <p className="text-small text-fg-subtle">No autolinkers in this article yet: Add New makes one.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rules.map((rule) => (
              <li key={rule.id} className={`flex min-w-0 items-center gap-3 rounded-(--card-radius) border bg-surface-muted p-2 ${editing === rule.id ? 'border-accent' : 'border-line'}`}>
                <Endpoint link={rule.link} editor={editor} onLeave={onClose} />
                {/* The phrases as tags: each at most 11rem wide, scrolling sideways when it is longer; clicking one goes to where it is written */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {rule.phrases.map((phrase) => (
                    <span key={phrase} className="inline-flex max-w-44 overflow-x-auto rounded-(--corner-sm) bg-fill whitespace-nowrap [scrollbar-width:thin]">
                      <Button variant="ghost" size="xs" plain className="shrink-0" title="Go to where it is written" onClick={() => goThere(rule, phrase)}>
                        {phrase}
                      </Button>
                    </span>
                  ))}
                </div>
                <IconButton icon={LuPencil} label={`Edit: ${rule.phrases.join(', ')}`} size="sm" variant={editing === rule.id ? 'selected' : 'ghost'} onClick={() => edit(rule)} />
                <IconButton icon={LuTrash2} label={`Delete: ${rule.phrases.join(', ')}`} size="sm" onClick={() => remove(rule)} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {importing && (
        <ImportModal
          editor={editor}
          self={self}
          have={phrases}
          onClose={() => setImporting(false)}
          onImport={(imported) => {
            // Into the form: the empty inputs are filled first, then new ones
            const kept = phrases.filter((p) => p.trim() !== '')
            const added = imported.filter((p) => !kept.some((k) => sameText(k, p)))
            setFormOpen(true)
            setPhrases([...kept, ...added, ...(kept.length + added.length === 0 ? [''] : [])])
            setNotice(added.length ? `Added ${added.length} ${added.length === 1 ? 'phrase' : 'phrases'}: they link to the same place as the others.` : 'Those phrases are already here.')
          }}
        />
      )}
    </Modal>
  )
}

/** Import from other article: pick an article, then which of the phrases of its autolinkers to add here; they link to the place chosen here */
function ImportModal({ editor, self, have, onClose, onImport }: { editor: Editor; self: string; have: string[]; onClose: () => void; onImport: (phrases: string[]) => void }) {
  const [from, setFrom] = useState<{ title: string; phrases: string[] } | null>(null)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [state, setState] = useState<'pick' | 'loading' | 'error'>('pick')
  const here = (phrase: string) => have.some((p) => sameText(p, phrase))

  const open = async (id: string, title: string) => {
    const articles = resourceByName('articles')
    if (!articles) return
    setState('loading')
    try {
      const article = (await articles.api.get(id)) as { content?: string }
      const found = rulesFrom(parse(editor, article.content ?? '')).flatMap((r) => r.phrases)
      const unique = found.filter((p, i) => found.findIndex((x) => sameText(x, p)) === i)
      setFrom({ title, phrases: unique })
      setTicked(new Set(unique.filter((p) => !here(p))))
      setState('pick')
    } catch {
      setState('error')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={from ? `Link phrases of “${from.title}”` : 'Import from other article'}
      footer={
        from && (
          <>
            <Button variant="ghost" onClick={() => setFrom(null)}>
              Another article
            </Button>
            <Button
              disabled={ticked.size === 0}
              onClick={() => {
                onImport(from.phrases.filter((p) => ticked.has(p)))
                onClose()
              }}
            >
              Add
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
        from.phrases.length === 0 ? (
          <p className="text-body text-fg-subtle">That article has no autolinkers to import phrases from.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {from.phrases.map((phrase) => (
              <li key={phrase} className="flex items-center gap-2">
                <CheckField
                  label={<span className="font-medium">{phrase}</span>}
                  checked={ticked.has(phrase) && !here(phrase)}
                  disabled={here(phrase)}
                  onChange={(on) => {
                    const next = new Set(ticked)
                    if (on) next.add(phrase)
                    else next.delete(phrase)
                    setTicked(next)
                  }}
                />
                {here(phrase) && <span className="ms-auto text-small text-fg-subtle">already here</span>}
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
