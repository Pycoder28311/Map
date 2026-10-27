import { useRef, useState } from 'react'
import { LuCheck, LuGitBranch, LuGitBranchPlus, LuPencil } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import { createBranch, renameMap, useMaps } from '../maps/maps'
import { useWorkspace } from '../workspace/useWorkspace'
import { branchList, nextBranchName } from './branches'
import BarPopover from '../../components/ui/overlays/BarPopover'
import { LIST_ITEM } from '../../components/ui/rowStyles'

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** The branches button: the maps that are versions of this one (the current one ticked), and a name with a button to make another from it */
export default function BranchesPopout({ mapId }: { mapId: string }) {
  const maps = useMaps()
  const workspace = useWorkspace()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const group = branchList(maps, mapId)
  // What the button says: the current branch's name (the first map of the group is the main one), or the way to make the first
  const map = group.find((o) => String(o.id) === mapId)
  const main = !map || !map.branchOf || map.branchOf === map.id
  const current = main ? 'main' : map.title

  // The text while the branch is being renamed (only a branch: the main one is the map, renamed by its big name); null: not renaming
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const commit = () => {
    const next = (draft ?? '').trim()
    if (!cancelled.current && next && map && next !== map.title) void renameMap(map.id, next)
    cancelled.current = false
    setDraft(null)
  }

  const show = (id: string) => {
    setOpen(false)
    if (id !== mapId) workspace.replace({ type: 'map', id: mapId }, { type: 'map', id })
  }
  const create = async () => {
    const id = await createBranch(maps, mapId, name.trim() || nextBranchName(group))
    if (!id) return
    setName('')
    show(id)
  }

  return (
    <BarPopover
      open={open}
      onOpenChange={setOpen}
      label="Map branches"
      trigger={
        draft !== null ? (
          <input
            autoFocus
            value={draft}
            aria-label="Branch name"
            size={Math.min(Math.max(draft.length, 4), 20)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                cancelled.current = true
                e.currentTarget.blur()
              }
            }}
            className="rounded-(--btn-close-radius) bg-transparent px-2 text-body outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
        ) : (
          // One grid cell, no positioning (the popover hangs from the bar): the pencil shows over the name's end while hovered
          <div className="group grid">
            <Button
              className="col-start-1 row-start-1"
              variant={open ? 'secondary' : 'ghost'}
              icon={LuGitBranch}
              aria-expanded={open}
              aria-label={group.length > 1 ? `Branches, now on ${current}` : 'Create branch'}
              title={group.length > 1 ? 'Branches' : 'Create branch'}
              onClick={() => setOpen(!open)}
            >
              <span className="max-w-32 truncate">{group.length > 1 ? current : 'Create branch'}</span>
            </Button>
            {!main && (
              <span className="pointer-events-none col-start-1 row-start-1 self-center justify-self-end rounded-(--btn-close-radius) bg-surface/70 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
                <IconButton icon={LuPencil} label="Rename branch" onClick={() => setDraft(current)} />
              </span>
            )}
          </div>
        )
      }
    >
      <ul className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
        {group.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              aria-current={String(o.id) === mapId}
              onClick={() => show(String(o.id))}
              className={LIST_ITEM}
            >
              <LuCheck className={`size-4 shrink-0 ${String(o.id) === mapId ? '' : 'invisible'}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{o.title}</span>
                <span className="block text-small text-fg-subtle">{when(o.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2 border-t border-line pt-2"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={nextBranchName(group)}
          aria-label="Name of the new branch"
          className="h-(--field-h) rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-body outline-none focus-visible:border-fg-subtle"
        />
        <Button type="submit" icon={LuGitBranchPlus} className="w-full">
          Create new branch
        </Button>
      </form>
    </BarPopover>
  )
}
