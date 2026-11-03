import { AUTOLINKERS_MAX, AUTOLINKER_PHRASES_MAX } from '@map/shared'
import { useState } from 'react'
import { LuDownload, LuPencil, LuPlus, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import Modal from '../../../components/ui/overlays/Modal'
import type { ArticleText } from '../text/articleText'
import { applyRule, longestFirst, removeRule, type AutoRule } from './autolink'
import AutolinkForm from './autolinker/AutolinkForm'
import { Endpoint, Tag } from './autolinker/AutolinkParts'
import ImportModal from './autolinker/ImportModal'
import { sameText } from './autolinker/sameText'
import { LINK_EDIT } from './linkExtensions'
import { LIMITS, newId, toHref, type ArticleLink } from './linkHref'

type Props = {
  /** The article's text: the autolinkers link all of it, whatever the editor holds */
  text: ArticleText
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

/**
 * The Autolinker, in the shared Modal: its header has the title, Import from other article and Add New (primary); Add New (or Edit on a
 * list row) opens the form: a sentence on what it does, the phrases as tags inside one input (Enter or leaving the input makes a tag; an X takes one out), the four kinds of link as four sections side by side, and Save. Under it the article's autolinkers, a
 * row each: "Link: <endpoint>", the phrases as tags (clicking one goes to where it is written), Edit and Delete. All the phrases of one
 * autolinker link to the same place; Save links every place they are written, and they are linked as they are typed (linkExtensions.ts).
 * The autolinkers are the article's `autolinkers` field (the page holds them and saves them with the text); links in the text carry their rule's id
 */
export default function AutolinkPanel({ text, self, startText, rules, onRules, userId, onClose }: Props) {
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
    let count = 0
    text.change((tr) => {
      if (editing) removeRule(tr, editing)
      for (const phrase of longestFirst(unique)) count += applyRule(tr, { id, text: phrase, link: target })
      tr.setMeta(LINK_EDIT, true)
    })
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
    text.change((tr) => {
      removeRule(tr, rule.id)
      tr.setMeta(LINK_EDIT, true)
    })
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
    <AutolinkForm
      text={text}
      self={self}
      phrases={phrases}
      draft={draft}
      words={words}
      onDraft={setDraft}
      onCommitDraft={commitDraft}
      onRemovePhrase={removePhrase}
      target={target}
      onPick={pick}
      version={version}
      editingRule={editingRule}
      editing={!!editing}
      onDelete={remove}
      onCancel={() => start(false)}
      onSave={save}
    />
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
                <Endpoint link={rule.link} doc={text.doc()} onLeave={onClose} />
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
          schema={text.schema}
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
