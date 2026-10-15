import { useState } from 'react'
import { LuCheck, LuGitBranch, LuGitBranchPlus } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { useMockObjects, createBranch } from '../../mocks/projectsStore'
import { useWorkspace } from '../workspace/useWorkspace'
import { branchList, nextBranchName } from './branches'
import BarPopover from './BarPopover'

const when = (ms: number) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** "Branches": the maps that are versions of this one (the current one ticked), and a name with a button to make another from it */
export default function BranchesPopout({ mapId }: { mapId: string }) {
  const objects = useMockObjects()
  const workspace = useWorkspace()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const group = branchList(objects, mapId)

  const show = (id: string) => {
    setOpen(false)
    if (id !== mapId) workspace.replace({ type: 'map', id: mapId }, { type: 'map', id })
  }
  const create = () => {
    const id = createBranch(mapId, name.trim() || nextBranchName(group))
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
        <Button variant={open ? 'secondary' : 'ghost'} icon={LuGitBranch} aria-expanded={open} aria-label="Branches" title="Branches" onClick={() => setOpen(!open)}>
          {group.length > 1 ? group.length : null}
        </Button>
      }
    >
      <ul className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
        {group.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              aria-current={o.id === mapId}
              onClick={() => show(o.id)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-(--corner-sm) px-2 py-1.5 text-start hover:bg-fill"
            >
              <LuCheck className={`size-4 shrink-0 ${o.id === mapId ? '' : 'invisible'}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{o.name}</span>
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
          create()
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
