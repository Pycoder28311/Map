import { useEditorState, type Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuBookmark, LuHash, LuMapPinPlus } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import SearchInput from '../../../components/ui/fields/SearchInput'
import { fold } from '../../search/search'
import { jumpTargets, resolveJump, type JumpTarget } from './jumpTargets'

/** The mark a target has, in the list and in the text's left margin (JumpGutter) */
export const targetIcon = (target: Pick<JumpTarget, 'kind'>) => (target.kind === 'heading' ? LuHash : LuBookmark)

type Props = {
  editor: Editor
  /** A target picked: its `to` (jumpTargets.ts) */
  onPick: (to: string) => void
  /** "Mark a place…": the next selection in the text becomes the target */
  onMarkPlace?: () => void
  /** The `to` picked now, shown as chosen */
  chosen?: string | null
  onRemove?: () => void
  /** Its search takes the focus when it opens (default) */
  autoFocus?: boolean
}

/** Jump link: the article's sections and marked places, each with its mark at its left, to pick where the words jump to */
export default function JumpPicker({ editor, onPick, onMarkPlace, chosen, onRemove, autoFocus = true }: Props) {
  const [query, setQuery] = useState('')
  const targets = useEditorState({ editor, selector: ({ editor: e }) => jumpTargets(e.state.doc), equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) })
  const chosenTarget = chosen ? resolveJump(editor.state.doc, chosen) : null
  const words = fold(query).split(/\s+/).filter(Boolean)
  const shown = targets.filter((t) => words.every((w) => fold(t.text).includes(w)))

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SearchInput label="Search sections" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={autoFocus} />
      <div role="listbox" aria-label="Places" className="flex max-h-64 flex-col overflow-y-auto">
        {shown.map((target) => {
          const picked = chosenTarget?.from === target.from
          return (
            // A section is indented by its level, a marked place under the section it is in
            <div key={`${target.kind}:${target.from}`} className={`shrink-0 ${target.kind === 'heading' ? (target.level >= 3 ? 'ps-4' : '') : 'ps-6'}`}>
              <Button
                role="option"
                aria-selected={picked}
                variant={picked ? 'selected' : 'ghost'}
                size="sm"
                icon={targetIcon(target)}
                className="w-full justify-start"
                onClick={() => onPick(target.to)}
              >
                <span className="min-w-0 flex-1 truncate text-start">{target.text || <span className="text-fg-subtle">Untitled section</span>}</span>
              </Button>
            </div>
          )
        })}
        {shown.length === 0 && <p className="px-2 py-1 text-small text-fg-subtle">{targets.length === 0 ? 'No sections or marked places yet.' : 'Nothing found.'}</p>}
      </div>
      <div className="flex items-center justify-between gap-2">
        {onMarkPlace && (
          <Button variant="ghost" size="sm" icon={LuMapPinPlus} onClick={onMarkPlace}>
            Mark a place…
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="sm" className="ms-auto" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
