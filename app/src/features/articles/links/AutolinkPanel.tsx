import type { Editor } from '@tiptap/react'
import { DOMParser as PMDOMParser, type Node as PMNode } from '@tiptap/pm/model'
import { useEffect, useState, type ReactNode } from 'react'
import { LuCornerDownRight, LuCheck, LuDownload, LuExternalLink, LuFileSymlink, LuInfo, LuPencil, LuPlus, LuSearch, LuTrash2, LuUserPlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import LinkButton from '../../../components/ui/buttons/LinkButton'
import CheckField from '../../../components/ui/fields/CheckField'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import Modal from '../../../components/ui/overlays/Modal'
import { resourceByName } from '../../../resources/registry'
import { fold } from '../../search/search'
import { useWorkspace } from '../../workspace/useWorkspace'
import { AUTOLINKERS_MAX, AUTOLINKER_PHRASES_MAX } from '@map/shared'
import { applyRule, fromStored, longestFirst, removeRule, rulesFrom, type AutoRule } from './autolink'
import FollowPicker from './FollowPicker'
import JumpPicker from './JumpPicker'
import { LINK_EDIT } from './linkExtensions'
import { isWebUrl, LIMITS, newId, toHref, type ArticleLink } from './linkHref'
import { LinkTargetName, useLinkInfo } from './LinkPreview'
import ObjectPicker from './ObjectPicker'

type Props = {
  editor: Editor
  /** The article itself (`article:<id>`): not offered as a target, nor to import from */
  self: string
  /** The words the first input starts with (the selection): given, the form is open at once */
  startText: string
  /** The article's autolinkers (its field: the page holds them), changed with `onRules`; `userId`: who makes a new one */
  rules: AutoRule[]
  onRules: (rules: AutoRule[]) => void
  userId: string
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

/** A draft opening: its height grows from nothing (the rows below move down with it) instead of appearing at once */
function Slide({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // Two frames: the closed size must be painted first, or there is nothing to slide from
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setOpen(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

/** The modal's two inputs, plain: a thin line round them, nothing else */
const SIMPLE_INPUT = 'w-full border border-line bg-surface px-2 py-1 text-body outline-none focus:border-accent'

/** A phrase as a tag (the autolinkers' rows, and the input while the phrases are written); `onRemove`: its X, in front of the text, shows while it is hovered */
function Tag({ phrase, onRemove }: { phrase: string; onRemove?: () => void }) {
  return (
    <span className="group/tag relative inline-flex max-w-44 shrink-0 items-center rounded-[4px] bg-fill-strong px-1.5 py-0.5 text-body leading-snug">
      <span className="truncate">{phrase}</span>
      {onRemove && (
        // At the tag's right end, in front of the text (the tag does not grow); shown while it is hovered. A button has no shape of its own
        // (styles/buttons.css): its box is clipped to the tag's corners
        <span className="absolute inset-y-0 end-0 inline-flex items-center overflow-hidden rounded-[4px] bg-fill-strong opacity-0 transition-opacity group-focus-within/tag:opacity-100 group-hover/tag:opacity-100">
          <IconButton icon={LuX} label={`Remove: ${phrase}`} size="sm" className="size-5 min-h-0 min-w-0 [--btn-icon-size:0.625rem]!" onClick={onRemove} />
        </span>
      )}
    </span>
  )
}

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
      <input aria-label="Link" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={LIMITS.url} className={SIMPLE_INPUT} />
      <Button type="submit" variant="text" size="sm" icon={LuCheck} aria-pressed={chosen?.kind === 'url' && chosen.url === full} disabled={!valid} className="self-start">
        Use this link
      </Button>
    </form>
  )
}

/** A section: its name with its icon and, at the right of the name, a search button (it opens the search field below it and becomes an X that closes it), then its picker */
function SectionBody({ title, icon: Icon, searchable, children }: { title: string; icon: PlainIcon; searchable: boolean; children: (searchOpen: boolean) => ReactNode }) {
  const [searching, setSearching] = useState(false)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-medium text-fg-muted">
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{title}</span>
        </h3>
        {searchable && (
          <IconButton icon={searching ? LuX : LuSearch} label={searching ? `Close the search of ${title}` : `Search in ${title}`} size="sm" aria-expanded={searching} onClick={() => setSearching(!searching)} />
        )}
      </div>
      {/* (closing it starts the picker again, so its search is empty the next time) */}
      <div key={String(searching)} className="flex min-w-0 flex-1 flex-col gap-2">
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
 * list row) opens the form: a sentence on what it does, the phrases as tags inside one input (Enter or leaving the input makes a tag; an X takes one out), the four kinds of link as four sections side by side, and Save. Under it the article's autolinkers, a
 * row each: "Link: <endpoint>", the phrases as tags (clicking one goes to where it is written), Edit and Delete. All the phrases of one
 * autolinker link to the same place; Save links every place they are written, and they are linked as they are typed (linkExtensions.ts).
 * The autolinkers are the article's `autolinkers` field (the page holds them and saves them with the text); links in the text carry their rule's id
 */
export default function AutolinkPanel({ editor, self, startText, rules, onRules, userId, onClose }: Props) {
  const [formOpen, setFormOpen] = useState(startText.trim() !== '')
  // The phrases already made into tags, and the words being typed (they become a tag on Enter or when the input loses the focus)
  const [phrases, setPhrases] = useState<string[]>(startText.trim() ? [startText.trim().slice(0, LIMITS.ruleText)] : [])
  const [draft, setDraft] = useState('')
  const [target, setTarget] = useState<ArticleLink | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  // A new target: the sections start on it (they read it once)
  const [version, setVersion] = useState(0)

  // (words typed and not made a tag yet count too: Save does not lose them)
  const words = [...phrases, draft].map((p) => p.trim()).filter(Boolean)
  const removePhrase = (i: number) => setPhrases(phrases.filter((_, at) => at !== i))
  /** The typed words become a tag (once: the same words twice make one) */
  const commitDraft = () => {
    const text = draft.trim()
    setDraft('')
    if (text && !phrases.some((p) => sameText(p, text))) setPhrases([...phrases, text])
  }

  /** A fresh form (Add New), or none (after Save or Cancel) */
  const start = (open: boolean, text = '') => {
    setFormOpen(open)
    setPhrases(text.trim() ? [text.trim()] : [])
    setDraft('')
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
    if (unique.length > AUTOLINKER_PHRASES_MAX) return setNotice(`An autolinker has at most ${AUTOLINKER_PHRASES_MAX} phrases.`)
    if (!editing && rules.length >= AUTOLINKERS_MAX) return setNotice(`An article has at most ${AUTOLINKERS_MAX} autolinkers: delete one first.`)
    const id = editing ?? newId()
    // The field first (the page saves it with the text the next lines change)
    const made: AutoRule = { id, phrases: unique, link: target, by: rules.find((r) => r.id === editing)?.by ?? userId, count: 0 }
    onRules(editing ? rules.map((r) => (r.id === editing ? made : r)) : [...rules, made])
    const tr = editor.state.tr
    if (editing) removeRule(tr, editing)
    let count = 0
    for (const text of longestFirst(unique)) count += applyRule(tr, { id, text, link: target })
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    setNotice(
      count === 0
        ? `${unique.length === 1 ? 'That phrase is' : 'Those phrases are'} not written anywhere in the article yet, so nothing was linked. The autolinker is kept: it links them when they are written.`
        : `Linked ${count} ${count === 1 ? 'place' : 'places'}.`,
    )
    start(false)
  }

  const edit = (rule: AutoRule) => {
    start(true)
    setEditing(rule.id)
    setPhrases(rule.phrases)
    setDraft('')
    setTarget(rule.link)
    setNotice(null)
  }

  const remove = (rule: AutoRule) => {
    onRules(rules.filter((r) => r.id !== rule.id))
    const tr = editor.state.tr
    removeRule(tr, rule.id)
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    if (editing === rule.id) start(false)
    setNotice(`“${rule.phrases.join('”, “')}” ${rule.phrases.length === 1 ? 'is' : 'are'} not linked any more.`)
  }

  // Choosing what is chosen already takes it back
  const pick = (link: ArticleLink) => {
    setTarget((now) => (now && toHref(now) === toHref(link) ? null : link))
    setNotice(null)
  }

  // The form of a new autolinker (above the list) or of the one being edited (right under its row)
  const editingRule = rules.find((r) => r.id === editing)
  const form = formOpen ? (
        <Slide>
          <div className="flex flex-col gap-3 rounded-(--card-radius) border border-line bg-surface-muted p-3">
            {/* What it does */}
            <div className="flex items-start gap-3">
            <p className="flex min-w-0 flex-1 items-start gap-2 text-[0.8125rem] text-fg-muted">
              <LuInfo aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                Write the words, then choose where they link.
                {/* What is chosen now: it appears again (a short pop) whenever the tags or the link change */}
                {(words.length > 0 || target) && (
                  <span key={`${words.join('|')}>${target ? toHref(target) : ''}`} className="ms-1 inline-flex animate-share-pop flex-wrap items-center gap-1 align-middle font-medium text-fg">
                    {words.length > 0 && <span>{`“${words.join('”, “')}”`}</span>}
                    <span aria-hidden>→</span>
                    {target ? <LinkTargetName link={target} editor={editor} /> : <span className="font-normal text-fg-subtle">choose where they link</span>}
                  </span>
                )}
              </span>
            </p>
            {/* At the top right: Delete (this autolinker, while one is edited), and an X that closes the draft */}
            <div className="flex shrink-0 items-center gap-1">
              {editingRule && (
                <Button variant="ghost" size="sm" plain icon={LuTrash2} className="text-danger" onClick={() => remove(editingRule)}>
                  Delete
                </Button>
              )}
              <IconButton icon={LuX} label="Close the draft" size="sm" onClick={() => start(false)} />
            </div>
            </div>

            {/* The phrases: tags inside one input. Write the words and press Enter, or click away, and they become a tag (an X on it takes it out;
                Backspace on an empty input takes the last one out) */}
            <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-1 border border-line bg-surface px-1.5 py-1 focus-within:border-accent">
              {phrases.map((phrase, i) => (
                <Tag key={phrase} phrase={phrase} onRemove={() => removePhrase(i)} />
              ))}
              <input
                aria-label="Words to link"
                placeholder={phrases.length === 0 ? 'The words to link… (Enter makes a tag)' : 'Another phrase…'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitDraft()
                  } else if (e.key === 'Backspace' && draft === '' && phrases.length > 0) removePhrase(phrases.length - 1)
                }}
                maxLength={LIMITS.ruleText}
                className="min-w-32 flex-1 bg-transparent text-body outline-none"
                autoFocus
              />
            </div>

            {/* The four kinds side by side, in the order of the link row's buttons (one box, a line between them): each with its name and, but Link, a
                search button at the right of the name */}
            <div key={version} className="flex flex-row divide-x divide-line overflow-x-auto rounded-(--card-radius) border border-line bg-surface [&_[role=option]]:h-7!">
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
                          archive
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

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" plain onClick={() => start(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={words.length === 0 || !target} onClick={save}>
                {editing ? 'Save autolinker' : 'Save'}
              </Button>
            </div>
          </div>

        </Slide>
  ) : null

  return (
    <Modal
      open
      onClose={onClose}
      title="Autolinker"
      // Narrow until a draft is open
      size={formOpen ? 'xl' : 'lg'}
      tightHeader
      smoothSize
      actions={
        <>
          <Button variant="text" size="sm" icon={LuDownload} className="[--btn-icon-size:0.75rem]!" onClick={() => setImporting(true)}>
            Import from other article
          </Button>
          {/* Add New turns into Cancel while a new draft is open */}
          {formOpen && !editing ? (
            <Button size="sm" plain icon={LuX} onClick={() => start(false)}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" plain icon={LuPlus} onClick={() => start(true)}>
              Add New
            </Button>
          )}
        </>
      }
    >
      <div className="@container flex flex-col gap-4">
        {formOpen && !editing && form}
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
              editing === rule.id && form ? (
                // The edit form takes the place of the row
                <li key={rule.id} className="list-none">
                  {form}
                </li>
              ) : (
              <li key={rule.id} className={`flex min-w-0 items-center gap-3 rounded-(--card-radius) border bg-surface-muted p-2 ${editing === rule.id ? 'border-accent' : 'border-line'}`}>
                <Endpoint link={rule.link} editor={editor} onLeave={onClose} />
                {/* The phrases as tags, as in the input (not clickable) */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {rule.phrases.map((phrase) => (
                    <Tag key={phrase} phrase={phrase} />
                  ))}
                </div>
                <IconButton icon={LuPencil} label={`Edit: ${rule.phrases.join(', ')}`} size="sm" variant={editing === rule.id ? 'selected' : 'ghost'} onClick={() => edit(rule)} />
                <IconButton icon={LuTrash2} label={`Delete: ${rule.phrases.join(', ')}`} size="sm" onClick={() => remove(rule)} />
              </li>
              )
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
            // Into the form, as tags after the ones there
            const added = imported.filter((p) => !phrases.some((k) => sameText(k, p)))
            setFormOpen(true)
            setPhrases([...phrases, ...added])
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
      const article = (await articles.api.get(id)) as { content?: string; autolinkers?: unknown }
      // Its autolinkers; an article not opened since they became a field has none yet: its text then
      const own = fromStored(article.autolinkers as never)
      const found = (own.length > 0 ? own : rulesFrom(parse(editor, article.content ?? ''))).flatMap((r) => r.phrases)
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
