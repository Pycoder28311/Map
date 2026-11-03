import { LuInfo, LuTrash2, LuX } from 'react-icons/lu'
import Button from '../../../../components/ui/buttons/Button'
import IconButton from '../../../../components/ui/buttons/IconButton'
import type { ArticleText } from '../../text/articleText'
import type { AutoRule } from '../autolink'
import FollowPicker from '../FollowPicker'
import JumpPicker from '../JumpPicker'
import { LIMITS, toHref, type ArticleLink } from '../linkHref'
import { AUTOLINK_KINDS } from '../linkKinds'
import { LinkTargetName } from '../LinkPreview'
import ObjectPicker from '../ObjectPicker'
import { SectionBody, Slide, Tag, UrlColumn } from './AutolinkParts'

type Props = {
  /** The article's text (Jump link's places, the chosen target's name) */
  text: ArticleText
  /** The article itself (`article:<id>`): not offered as a target */
  self: string
  /** The phrases made into tags, the words being typed, and all of them (what Save takes) */
  phrases: string[]
  draft: string
  words: string[]
  onDraft: (draft: string) => void
  /** The typed words become a tag */
  onCommitDraft: () => void
  onRemovePhrase: (index: number) => void
  /** Where they link (null: not chosen yet), and a choice (choosing the chosen one takes it back) */
  target: ArticleLink | null
  onPick: (link: ArticleLink) => void
  /** A new target: the sections start on it (they read it once) */
  version: number
  /** The autolinker being edited (its Delete), or none: a new one */
  editingRule: AutoRule | undefined
  editing: boolean
  onDelete: (rule: AutoRule) => void
  onCancel: () => void
  onSave: () => void
}

/**
 * The form of an autolinker: a sentence on what it does (and what is chosen now), the phrases as tags inside one input (Enter or leaving
 * the input makes a tag; an X takes one out), the four kinds of link as four sections side by side, and Save
 */
export default function AutolinkForm({ text, self, phrases, draft, words, onDraft, onCommitDraft, onRemovePhrase, target, onPick, version, editingRule, editing, onDelete, onCancel, onSave }: Props) {
  return (
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
                {target ? <LinkTargetName link={target} doc={text.doc()} /> : <span className="font-normal text-fg-subtle">choose where they link</span>}
              </span>
            )}
          </span>
        </p>
        {/* At the top right: Delete (this autolinker, while one is edited), and an X that closes the draft */}
        <div className="flex shrink-0 items-center gap-1">
          {editingRule && (
            <Button variant="ghost" size="sm" plain icon={LuTrash2} className="text-danger" onClick={() => onDelete(editingRule)}>
              Delete
            </Button>
          )}
          <IconButton icon={LuX} label="Close the draft" size="sm" onClick={() => onCancel()} />
        </div>
        </div>

        {/* The phrases: tags inside one input. Write the words and press Enter, or click away, and they become a tag (an X on it takes it out;
            Backspace on an empty input takes the last one out) */}
        <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-1 border border-line bg-surface px-1.5 py-1 focus-within:border-accent">
          {phrases.map((phrase, i) => (
            <Tag key={phrase} phrase={phrase} onRemove={() => onRemovePhrase(i)} />
          ))}
          <input
            aria-label="Words to link"
            placeholder={phrases.length === 0 ? 'The words to link… (Enter makes a tag)' : 'Another phrase…'}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onBlur={onCommitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onCommitDraft()
              } else if (e.key === 'Backspace' && draft === '' && phrases.length > 0) onRemovePhrase(phrases.length - 1)
            }}
            maxLength={LIMITS.ruleText}
            className="min-w-32 flex-1 bg-transparent text-body outline-none"
            autoFocus
          />
        </div>

        {/* The four kinds side by side, in the order of the link row's buttons (one box, a line between them): each with its name and, but Link, a
            search button at the right of the name */}
        <div key={version} className="flex flex-row divide-x divide-line overflow-x-auto rounded-(--card-radius) border border-line bg-surface [&_[role=option]]:h-7!">
          {AUTOLINK_KINDS.map((s) => (
            <section key={s.id} aria-label={s.label} className="flex min-w-56 flex-1 flex-col p-2">
              <SectionBody title={s.label} icon={s.icon} searchable={s.searchable}>
                {(searching) =>
                  s.id === 'url' ? (
                    <UrlColumn chosen={target} onPick={onPick} />
                  ) : s.id === 'object' ? (
                    <ObjectPicker
                      exclude={self}
                      chosen={target?.kind === 'object' ? target : null}
                      onPick={(hit) => onPick({ kind: 'object', type: hit.type, id: hit.id })}
                      listHeight="max-h-48"
                      autoFocus={searching}
                      showSearch={searching}
                      archive
                    />
                  ) : s.id === 'jump' ? (
                    <JumpPicker text={text} chosen={target?.kind === 'jump' ? target.to : null} onPick={(to) => onPick({ kind: 'jump', to })} autoFocus={searching} showSearch={searching} />
                  ) : (
                    <FollowPicker chosen={target} onPick={onPick} autoFocus={searching} showSearch={searching} />
                  )
                }
              </SectionBody>
            </section>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" plain onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button size="sm" disabled={words.length === 0 || !target} onClick={onSave}>
            {editing ? 'Save autolinker' : 'Save'}
          </Button>
        </div>
      </div>

    </Slide>
  )
}
