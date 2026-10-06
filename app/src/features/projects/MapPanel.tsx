import { LuMap } from 'react-icons/lu'
import { findMap } from '../../mocks/projects'
import type { PanelProps } from '../workspace/types'

/** One map (placeholder until real maps exist) */
export default function MapPanel({ id }: PanelProps) {
  const map = findMap(id)
  if (!map) return <p className="p-4 text-body text-fg-muted">Map not found.</p>

  return (
    <div className="flex h-full min-h-48 flex-col gap-2 p-4">
      <p className="text-body text-fg-muted">{map.project.name}</p>
      <div className="flex flex-1 items-center justify-center rounded-(--card-radius) bg-fill text-fg-subtle">
        <LuMap className="size-10" aria-hidden="true" />
      </div>
    </div>
  )
}
