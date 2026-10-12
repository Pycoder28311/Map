import { useState } from 'react'
import { LuRotateCcw, LuTrash2 } from 'react-icons/lu'
import LayoutThumb from '../../../features/layouts/LayoutThumb'
import { parsePanelKey } from '../../../features/workspace/layout'
import { usePanelRegistry } from '../../../features/workspace/registryContext'
import { deleteArchivedLayouts, deleteLayout, restoreLayout, useLayoutsState, type SavedLayout } from '../../../mocks/layoutsStore'
import { emptyTrash, restoreObject, useMockObjects } from '../../../mocks/projectsStore'
import { KIND_ICON, type SidebarItem } from '../../../mocks/sidebarTree'
import Button from '../../ui/buttons/Button'
import IconButton from '../../ui/buttons/IconButton'
import Modal from '../../ui/overlays/Modal'
import { snapshotRows } from '../../ui/tree/rowFlip'
import { DeleteDialog } from '../../../features/objects/ObjectDialogs'

const ROW = 'flex items-center gap-2 rounded-(--btn-radius) px-2 py-1.5 hover:bg-fill'

/**
 * What's in the trash (objects, then saved layouts): restore one, delete it for good, or empty the
 * trash (deleting always asks first)
 */
export default function TrashModal({ onClose }: { onClose: () => void }) {
  const objects = useMockObjects()
  const archived = objects.filter((o) => o.archived)
  const layouts = useLayoutsState().layouts.filter((l) => l.archived)
  const registry = usePanelRegistry()
  const total = archived.length + layouts.length
  const [deleting, setDeleting] = useState<SidebarItem | null>(null)
  const [deletingLayout, setDeletingLayout] = useState<SavedLayout | null>(null)
  const [emptying, setEmptying] = useState(false)

  const namesOf = (layout: SavedLayout) =>
    layout.panels.map((key) => {
      const panel = parsePanelKey(key)
      return (panel && registry[panel.type]?.title(panel.id)) || 'Missing'
    })

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Trash"
        footer={
          total > 0 && (
            <Button variant="secondary" className="text-danger" icon={LuTrash2} onClick={() => setEmptying(true)}>
              Empty trash
            </Button>
          )
        }
      >
        {total === 0 ? (
          <p className="text-body text-fg-muted">The trash is empty. Drag an object onto the bin to archive it.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {archived.map((o) => {
              const Icon = KIND_ICON[o.kind]
              const parent = o.parentId ? objects.find((p) => p.id === o.parentId) : undefined
              return (
                <li key={o.id} className={ROW}>
                  <Icon className="size-(--btn-icon-size) shrink-0 text-fg-subtle" />
                  <span className="min-w-0 flex-1 truncate text-body">
                    {o.name}
                    {parent && <span className="text-fg-subtle"> · in {parent.name}</span>}
                  </span>
                  <IconButton
                    icon={LuRotateCcw}
                    label={`Restore ${o.name}`}
                    onClick={() => {
                      snapshotRows()
                      restoreObject(o.id)
                    }}
                  />
                  <IconButton
                    icon={LuTrash2}
                    label={`Delete ${o.name} for good`}
                    className="text-danger"
                    onClick={() => setDeleting({ kind: o.kind, id: o.id, name: o.name, parentId: o.parentId })}
                  />
                </li>
              )
            })}
            {layouts.map((layout) => {
              const names = namesOf(layout)
              return (
                <li key={layout.id} className={ROW}>
                  <LayoutThumb layout={{ ...layout, id: `trash-${layout.id}` }} names={names} labels={false} className="aspect-video w-8 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-body">
                    Layout <span className="text-fg-subtle">· {names.join(', ')}</span>
                  </span>
                  <IconButton icon={LuRotateCcw} label="Restore layout" onClick={() => restoreLayout(layout.id)} />
                  <IconButton icon={LuTrash2} label="Delete layout for good" className="text-danger" onClick={() => setDeletingLayout(layout)} />
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      {deletingLayout && (
        <Modal
          open
          onClose={() => setDeletingLayout(null)}
          title="Delete layout"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeletingLayout(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                onClick={() => {
                  deleteLayout(deletingLayout.id)
                  setDeletingLayout(null)
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-body">Delete this layout ({namesOf(deletingLayout).join(', ')})? This can't be undone.</p>
        </Modal>
      )}

      {deleting && <DeleteDialog item={deleting} onClose={() => setDeleting(null)} />}
      {emptying && (
        <Modal
          open
          onClose={() => setEmptying(false)}
          title="Empty trash"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEmptying(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="text-danger"
                onClick={() => {
                  emptyTrash()
                  deleteArchivedLayouts()
                  setEmptying(false)
                }}
              >
                Delete all
              </Button>
            </>
          }
        >
          <p className="text-body">
            Delete the {total} {total === 1 ? 'item' : 'items'} in the trash for good? This can't be undone.
          </p>
        </Modal>
      )}
    </>
  )
}
