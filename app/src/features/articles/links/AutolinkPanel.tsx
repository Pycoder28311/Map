import { useEditorState, type Editor } from '@tiptap/react'
import { DOMParser as PMDOMParser, type Node as PMNode } from '@tiptap/pm/model'
import { useState, type ReactNode } from 'react'
import { LuCheck, LuDownload, LuExternalLink, LuForward, LuPencil, LuPlus, LuSearch, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import CheckField from '../../../components/ui/fields/CheckField'
import InputBox from '../../../components/ui/fields/InputBox'
import TextField from '../../../components/ui/fields/TextField'
import { FIELD_INPUT } from '../../../components/ui/fields/fieldStyles'
import Modal from '../../../components/ui/overlays/Modal'
import { resourceByName } from '../../../resources/registry'
import { fold } from '../../search/search'
import { applyRule, longestFirst, removeRule, ruleRanges, rulesFrom, type AutoRule } from './autolink'
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
  /** The words the first input starts with (the selection) */
  startText: string
  /** Closes the modal this is in (Go there leaves it, to show the place) */
  onClose: () => void
}

const sameText = (a: string, b: string) => fold(a.trim()) === fold(b.trim())

/**
 * One kind's section of the joined row: its name, a search button at the right of the name (when the section has a search: it opens the
 * search field below the name, and the button becomes an X that closes it), then its picker. The picker is given whether the search is open
 */
function Column({ title, searchable = false, children }: { title: string; searchable?: boolean; children: (searchOpen: boolean) => ReactNode }) {
  const [searching, setSearching] = useState(false)
  return (
    <section aria-label={title} className="flex min-w-56 flex-1 flex-col gap-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-small font-medium text-fg-muted">{title}</h3>
        {searchable && (
          <IconButton
            icon={searching ? LuX : LuSearch}
            label={searching ? `Close the search of ${title}` : `Search in ${title}`}
            size="sm"
            aria-expanded={searching}
            onClick={() => setSearching(!searching)}
          />
        )}
      </div>
      {/* (closing it starts the picker again, so its search is empty the next time) */}
      <div key={String(searching)} className="flex min-w-0 flex-col gap-2">
        {children(searching)}
      </div>
    </section>
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
      <TextField label="Link" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={LIMITS.url} />
      <Button
        type="submit"
        variant={chosen?.kind === 'url' && chosen.url === full ? 'selected' : 'ghost'}
        size="sm"
        icon={LuExternalLink}
        disabled={!valid}
        className="self-start"
      >
        Use this link
      </Button>
    </form>
  )
}

/** What a rule's list row says under its phrases: the address it was saved with, or the name of what it links to */
function RuleTarget({ link, editor }: { link: ArticleLink; editor: Editor }) {
  if (link.kind === 'url' || link.kind === 'project-url') return <span className="truncate text-small text-fg-subtle">{link.url}</span>
  return <LinkTargetName link={link} editor={editor} />
}

/**
 * The Autolinker's modal content: the phrases to link (an input each, an X at the right of each, Add link phrase under them and, once
 * there are more than one, Import from other article), a sentence on what it does, the four kinds of link side by side to choose where
 * the phrases go (Link, Attach Content, Jump link, Follow; never Message; each but Link has a search button at the right of its name),
 * then the article's autolinkers, two in a row: the phrases as the title, the saved address under it, Edit and Delete at the left, and
 * Go there at the right. All the phrases of one autolinker link to the same place. Apply links every place the phrases are written, and
 * keeps linking them as they are typed (linkExtensions.ts). An autolinker lives only in the links it made (autolink.ts)
 */
export default function AutolinkPanel({ editor, self, startText, onClose }: Props) {
  const [phrases, setPhrases] = useState<string[]>([startText.slice(0, LIMITS.ruleText)])
  const [target, setTarget] = useState<ArticleLink | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  // Which place Go there showed last, for each autolinker
  const [visited, setVisited] = useState<Record<string, number>>({})
  // A new target: the sections start on it (they read it once)
  const [version, setVersion] = useState(0)
  const rules =
    useEditorState({ editor, selector: ({ editor: e }) => rulesFrom(e.state.doc), equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }) ?? []

  const words = phrases.map((p) => p.trim()).filter(Boolean)
  const setPhrase = (i: number, text: string) => setPhrases(phrases.map((p, at) => (at === i ? text : p)))
  // The X of an input: takes it away; the last one left is only emptied
  const removePhrase = (i: number) => setPhrases(phrases.length === 1 ? [''] : phrases.filter((_, at) => at !== i))

  const reset = () => {
    setPhrases([''])
    setTarget(null)
    setEditing(null)
    setVersion((v) => v + 1)
  }

  const apply = () => {
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
    reset()
  }

  const edit = (rule: AutoRule) => {
    setEditing(rule.id)
    setPhrases(rule.phrases)
    setTarget(rule.link)
    setNotice(null)
    setVersion((v) => v + 1)
  }

  const remove = (rule: AutoRule) => {
    const tr = editor.state.tr
    removeRule(tr, rule.id)
    editor.view.dispatch(tr.setMeta(LINK_EDIT, true))
    if (editing === rule.id) reset()
    setNotice(`“${rule.phrases.join('”, “')}” ${rule.phrases.length === 1 ? 'is' : 'are'} not linked any more.`)
  }

  // The modal covers the text, so it closes first; then the place is shown, the next one each time
  const goThere = (rule: AutoRule) => {
    const places = ruleRanges(editor.state.doc, rule.id)
    if (places.length === 0) return
    const next = ((visited[rule.id] ?? -1) + 1) % places.length
    setVisited({ ...visited, [rule.id]: next })
    onClose()
    window.setTimeout(() => goTo(editor, places[next].from, places[next].to), 60)
  }

  const pick = (link: ArticleLink) => {
    setTarget(link)
    setNotice(null)
  }

  return (
    <div className="@container flex flex-col gap-4">
      {/* The phrases to link: an input each with its X, and Add link phrase under them at the right */}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        {/* A label over the inputs, and at its right the two buttons: Import (an underlined text button, once there are more phrases) and, the most to the right, Add link phrase */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-small font-medium text-fg-muted">Link phrases</h3>
          <div className="flex items-center gap-4">
            {phrases.length > 1 && (
              <Button variant="text" size="sm" icon={LuDownload} onClick={() => setImporting(true)}>
                Import from other article
              </Button>
            )}
            <Button variant="ghost" size="sm" plain filled icon={LuPlus} onClick={() => setPhrases([...phrases, ''])}>
              Add link phrase
            </Button>
          </div>
        </div>
        {phrases.map((phrase, i) => (
          <div key={i} className="flex items-center gap-2">
            <InputBox className="min-w-0 flex-1">
              <input
                aria-label={i === 0 ? 'Words to link' : `Link phrase ${i + 1}`}
                placeholder={i === 0 ? 'The words to link…' : 'Another phrase to link to the same place…'}
                value={phrase}
                onChange={(e) => setPhrase(i, e.target.value)}
                maxLength={LIMITS.ruleText}
                className={FIELD_INPUT}
                autoFocus={i === 0 || i === phrases.length - 1}
              />
            </InputBox>
            <IconButton
              icon={LuX}
              label={phrases.length === 1 ? 'Clear the words' : `Remove phrase ${i + 1}`}
              size="lg"
              disabled={phrases.length === 1 && phrase === ''}
              onClick={() => removePhrase(i)}
            />
          </div>
        ))}
      </form>

      <p className="text-heading text-fg-muted">
        Write the words you want to link, then choose below where they go. Every place they are written in the article becomes that link, and so do the ones you
        write later.
      </p>

      {/* The four kinds side by side, in the order of the buttons (LinkRow.tsx): one box, a line between them */}
      <div key={version} className="flex flex-row divide-x divide-line overflow-x-auto rounded-(--card-radius) border border-line">
        <Column title="Link">{() => <UrlColumn chosen={target} onPick={pick} />}</Column>
        <Column title="Attach Content" searchable>
          {(searching) => (
            <ObjectPicker
              exclude={self}
              chosen={target?.kind === 'object' ? target : null}
              onPick={(hit) => pick({ kind: 'object', type: hit.type, id: hit.id })}
              listHeight="max-h-48"
              showSearch={searching}
            />
          )}
        </Column>
        <Column title="Jump link" searchable>
          {(searching) => (
            <JumpPicker
              editor={editor}
              chosen={target?.kind === 'jump' ? target.to : null}
              onPick={(to) => pick({ kind: 'jump', to })}
              autoFocus={searching}
              showSearch={searching}
            />
          )}
        </Column>
        <Column title="Follow" searchable>
          {(searching) => <FollowPicker chosen={target} onPick={pick} autoFocus={searching} showSearch={searching} />}
        </Column>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small text-fg-muted">{words.length ? `“${words.join('”, “')}”` : 'No words yet'} →</span>
        {target ? <LinkTargetName link={target} editor={editor} /> : <span className="text-small text-fg-subtle">choose where they link</span>}
        <div className="ms-auto flex gap-2">
          {editing && (
            <Button variant="ghost" size="sm" icon={LuX} onClick={reset}>
              Cancel
            </Button>
          )}
          <Button size="sm" icon={LuCheck} disabled={words.length === 0 || !target} onClick={apply}>
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
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <h3 className="text-small font-medium text-fg-muted">Autolinkers of this article ({rules.length})</h3>
        {rules.length === 0 ? (
          <p className="text-small text-fg-subtle">None yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`flex min-w-0 items-center gap-1 rounded-(--card-radius) border p-2 ${editing === rule.id ? 'border-accent' : 'border-line'}`}
              >
                <IconButton
                  icon={LuPencil}
                  label={`Edit: ${rule.phrases.join(', ')}`}
                  size="sm"
                  variant={editing === rule.id ? 'selected' : 'ghost'}
                  onClick={() => edit(rule)}
                />
                <IconButton icon={LuTrash2} label={`Delete: ${rule.phrases.join(', ')}`} size="sm" onClick={() => remove(rule)} />
                <div className="flex min-w-0 flex-1 flex-col ps-1">
                  <span className="truncate text-body font-medium">{rule.phrases.join(', ')}</span>
                  <RuleTarget link={rule.link} editor={editor} />
                </div>
                <IconButton
                  icon={LuForward}
                  label={`Go there: ${rule.phrases.join(', ')}${visited[rule.id] !== undefined ? ` (${visited[rule.id] + 1} / ${rule.count})` : ''}`}
                  size="sm"
                  onClick={() => goThere(rule)}
                />
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
            // Into the empty inputs first, then new ones
            const kept = phrases.filter((p) => p.trim() !== '')
            const added = imported.filter((p) => !kept.some((k) => sameText(k, p)))
            setPhrases([...kept, ...added, ...(kept.length + added.length === 0 ? [''] : [])])
            setNotice(
              added.length
                ? `Added ${added.length} ${added.length === 1 ? 'phrase' : 'phrases'}: they link to the same place as the others.`
                : 'Those phrases are already here.',
            )
          }}
        />
      )}
    </div>
  )
}

/** Import from other article: pick an article, then which of the phrases of its autolinkers to add here; they link to the place chosen here */
function ImportModal({
  editor,
  self,
  have,
  onClose,
  onImport,
}: {
  editor: Editor
  self: string
  have: string[]
  onClose: () => void
  onImport: (phrases: string[]) => void
}) {
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
