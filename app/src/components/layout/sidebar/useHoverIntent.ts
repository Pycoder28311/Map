import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'

type Options = {
    /** Off: never opens (closes right away if it was open) */
    enabled: boolean
    /** The pointer must stay this long before it opens, so passing over it does nothing (ms) */
    openDelay: number
    /** ...and be gone this long before it closes, so a slip over the edge doesn't close it (ms) */
    closeDelay: number
}

/**
 * Open while the mouse rests on an element, or keyboard focus is inside it (opens at once).
 * Spread `handlers` on the element. Touch and pen are ignored: a tap is a click, not a hover.
 * Children in the top layer (e.g. a popover menu) count as inside: they're still DOM children.
 */
export function useHoverIntent({ enabled, openDelay, closeDelay }: Options) {
    const [open, setOpen] = useState(false)
    const hovered = useRef(false)
    const focused = useRef(false)
    const timer = useRef<number>(undefined)

    useEffect(() => () => clearTimeout(timer.current), [])

    const update = (delay: number) => {
        const next = hovered.current || focused.current
        clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setOpen(next), next ? delay : closeDelay)
    }

    const handlers = {
        onPointerEnter: (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            hovered.current = true
            update(openDelay)
        },
        onPointerLeave: (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            hovered.current = false
            update(openDelay)
        },
        onFocus: (e: FocusEvent) => {
            // Keyboard only: a click also focuses, but then the pointer is already over it
            if (!e.target.matches(':focus-visible')) return
            focused.current = true
            update(0)
        },
        onBlur: (e: FocusEvent) => {
            if (e.currentTarget.contains(e.relatedTarget)) return
            focused.current = false
            update(0)
        },
    }

    return { open: enabled && open, handlers }
}
