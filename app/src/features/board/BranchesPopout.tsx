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

/**
 * The branches, opened from the title bar's ⋯ (it hangs under the bar): the maps that are versions of this one (the current one ticked),
 * the current branch's name with a pencil to rename it (not the main one: that is the map, renamed by its big name), and a name with a
 * button to make another from it
 */
export default function BranchesPopout({ mapId, open, onOpenChange }: { mapId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const maps = useMaps()
  const workspace = useWorkspace()
  const [name, setName] = useState('')
  const group = branchList(maps, mapId)
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
    onOpenChange(false)
    if (id !== mapId) workspace.replace({ type: 'map', id: mapId }, { type: 'map', id })
  }
  const create = async () => {
    const id = await createBranch(maps, mapId, name.trim() || nextBranchName(group))
    if (!id) return
    setName('')
    show(id)
  }

  return (
    <BarPopover open={open} onOpenChange={onOpenChange} label="Map branches" trigger={null}>
      <div className="flex min-h-8 items-center gap-1 px-2 pb-1">
        <LuGitBranch className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        {draft !== null ? (
          <input
            autoFocus
            value={draft}
            aria-label="Branch name"
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
            className="min-w-0 flex-1 rounded-(--btn-close-radius) bg-transparent px-1 text-body outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-small text-fg-subtle">{group.length > 1 ? `On ${current}` : 'No branches yet'}</span>
            {!main && <IconButton icon={LuPencil} label="Rename branch" size="sm" onClick={() => setDraft(current)} />}
          </>
        )}
      </div>
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
