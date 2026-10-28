import { describe, expect, it, vi } from 'vitest'
import { closeOnOutsideScroll } from './popoverScroll'

describe('closeOnOutsideScroll', () => {
  it('closes when something outside the menu scrolls, but not when the menu itself does', () => {
    const scope = new EventTarget()
    const inside = new EventTarget()
    const outside = new EventTarget()
    const close = vi.fn()
    const stop = closeOnOutsideScroll({ contains: (node) => node === (inside as unknown as Node) }, close, scope)

    // The events reach the scope the way a scroll reaches the window: with the element it came from as `target`
    const scrolled = (from: EventTarget) => {
      const event = new Event('scroll')
      Object.defineProperty(event, 'target', { value: from })
      scope.dispatchEvent(event)
    }
    scrolled(inside)
    expect(close).not.toHaveBeenCalled()
    scrolled(outside)
    expect(close).toHaveBeenCalledTimes(1)

    stop()
    scrolled(outside)
    scope.dispatchEvent(new Event('resize'))
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('closes when the window is resized', () => {
    const scope = new EventTarget()
    const close = vi.fn()
    closeOnOutsideScroll({ contains: () => false }, close, scope)
    scope.dispatchEvent(new Event('resize'))
    expect(close).toHaveBeenCalledTimes(1)
  })
})
