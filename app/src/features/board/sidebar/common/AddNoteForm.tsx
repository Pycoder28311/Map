import { useRef, useState } from 'react'
import { LuFileText, LuStickyNote } from 'react-icons/lu'
import Button from '../../../../components/ui/buttons/Button'
import { createArticle, createNote } from '../../../../mocks/projectsStore'
import { toggleSidebarLink } from '../../../links/linkPick'

type Kind = 'note' | 'article'

const TABS = [
  { kind: 'note', label: 'Add note', icon: LuStickyNote },
  { kind: 'article', label: 'Add article', icon: LuFileText },
] as const

// A field inside the title + text group (the group draws the border), like the Create modal's
// The Create modal's tabs: no background until hovered or picked
const TAB =
  'flex basis-0 cursor-pointer items-center justify-center gap-2 rounded-(--btn-radius) border px-2.5 py-1.5 text-body font-medium whitespace-nowrap transition-[flex-grow,background-color,color] duration-200 ' +
  'motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'
const INNER = 'w-full bg-transparent px-(--field-px) text-body text-fg outline-none placeholder:text-fg-subtle'

/**
 * A note (shown at first) or an article to write and add: its title and text, the two kinds as tabs, and Add at the bottom. It
 * is made at the sidebar's top level and linked to this object, so the links list above shows it at once. Nothing opens.
 */
export default function AddNoteForm({ mapId, objectId }: { mapId: string; objectId: number }) {
  const [kind, setKind] = useState<Kind>('note')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const canAdd = title.trim() !== '' || text.trim() !== ''

  const add = () => {
    if (!canAdd) return
    const name = title.trim() || 'Untitled'
    const body = text.trim() || undefined
    toggleSidebarLink(mapId, objectId, kind === 'note' ? createNote(name, body) : createArticle(name, body))
    setTitle('')
    setText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label="What to add" className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={kind === t.kind}
            onClick={() => setKind(t.kind)}
            // The picked tab is half as wide again as the other (3 parts to 2), the width gliding when the pick changes
            className={`${TAB} ${kind === t.kind ? 'grow-3 border-line-strong bg-fill-strong text-fg' : 'grow-2 border-line-strong text-fg-muted hover-fill hover:text-fg'}`}
          >
            <t.icon className="size-(--btn-icon-size) shrink-0" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col overflow-hidden rounded-(--field-radius) border border-line-strong bg-surface transition-colors focus-within:border-fg-subtle">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          // Down goes to the text
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown') return
            e.preventDefault()
            textRef.current?.focus()
            textRef.current?.setSelectionRange(0, 0)
          }}
          placeholder="Title"
          aria-label={`${kind} title`}
          className={`${INNER} py-2 font-medium`}
        />
        <hr className="mx-1.5 my-0 border-0 border-t border-line-strong" />
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          // Up on the first line goes back to the title
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' || e.currentTarget.selectionStart !== e.currentTarget.selectionEnd || e.currentTarget.value.slice(0, e.currentTarget.selectionStart).includes('\n')) return
            e.preventDefault()
            titleRef.current?.focus()
          }}
          rows={8}
          placeholder={kind === 'note' ? 'Write a note…' : 'Write an article…'}
          aria-label={`${kind} text`}
          className={`${INNER} min-h-44 resize-none py-2`}
        />
      </div>
      <Button variant="primary" onClick={add} disabled={!canAdd} className="w-full">
        Add
      </Button>
    </div>
  )
}
