import { useEffect, useRef, useState } from 'react'
import { reorderChildren } from '../../mocks/projectsStore'
import { snapshotBlocks } from './blockFlip'

/** Where a moved project row would land: before this row (null: after the last) */
export type RowDropAt = { beforeId: string | null }

/**
 * Moving a project row by the grip on its name: while the pointer is held, `at` says where it would land
 * (between the project rows, by the pointer's height); releasing puts it there, keeping the others' order.
 * The rows are the sections in `rootRef` with data-project-row="<project id>".
 */
export function useRowReorder(rootRef: React.RefObject<HTMLElement | null>, projectIds: string[]) {
    const [dragging, setDragging] = useState<string | null>(null)
    const [at, setAt] = useState<RowDropAt | null>(null)
    const cleanup = useRef<(() => void) | null>(null)
    useEffect(() => () => cleanup.current?.(), [])

    const start = (id: string) => (e: React.PointerEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        const where = (y: number): RowDropAt => {
            const others = projectIds.filter((p) => p !== id)
            for (const other of others) {
                const el = rootRef.current?.querySelector(`[data-project-row="${CSS.escape(other)}"]`)
                const r = el?.getBoundingClientRect()
                if (r && y < r.top + r.height / 2) return { beforeId: other }
            }
            return { beforeId: null }
        }
        let current: RowDropAt = where(e.clientY)
        setDragging(id)
        setAt(current)
        const move = (ev: PointerEvent) => {
            current = where(ev.clientY)
            setAt(current)
        }
        const end = (ev: PointerEvent) => {
            cleanup.current?.()
            if (ev.type === 'pointerup') {
                const rest = projectIds.filter((p) => p !== id)
                const index = current.beforeId ? rest.indexOf(current.beforeId) : rest.length
                const next = [...rest.slice(0, index), id, ...rest.slice(index)]
                if (next.join() !== projectIds.join()) {
                    snapshotBlocks()
                    reorderChildren(null, next)
                }
            }
        }
        const key = (ev: KeyboardEvent) => ev.key === 'Escape' && end(new PointerEvent('pointercancel'))
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', end)
        window.addEventListener('pointercancel', end)
        window.addEventListener('keydown', key)
        document.body.style.cursor = 'grabbing'
        cleanup.current = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', end)
            window.removeEventListener('pointercancel', end)
            window.removeEventListener('keydown', key)
            document.body.style.cursor = ''
            cleanup.current = null
            setDragging(null)
            setAt(null)
        }
    }

    return { dragging, at, start }
}
