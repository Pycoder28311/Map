// A popover menu follows its button only as the page stays where it was, so it closes when the page scrolls or the window is resized. A scroll
// INSIDE the menu (a long list) is not the page's: the menu stays open and only its own list moves.

/** What can say whether a node is inside it (a menu element) */
type Container = { contains: (node: Node | null) => boolean }

/**
 * Closes the menu (with `close`) when something outside it scrolls or the window is resized. Returns what stops the listening: call it when
 * the menu closes. A scroll whose target is inside `menu` is ignored. `scope` is where the events are heard (the window).
 */
export function closeOnOutsideScroll(menu: Container, close: () => void, scope: EventTarget = window): () => void {
  const onScroll = (event: Event) => {
    if (menu.contains(event.target as Node | null)) return
    close()
  }
  scope.addEventListener('scroll', onScroll, { capture: true })
  scope.addEventListener('resize', close)
  return () => {
    scope.removeEventListener('scroll', onScroll, { capture: true })
    scope.removeEventListener('resize', close)
  }
}
