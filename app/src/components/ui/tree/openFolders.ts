// Which folders of a tree stay open as its nodes change. Pure (openFolders.test.ts).
import type { TreeNode } from './types'

/**
 * The open folders without the ones that have no children now: a folder that lost its last child closes, so when something is put in
 * it again it starts closed. A folder that is not among the nodes (not drawn at the moment) keeps its state. The same Set when
 * nothing closes.
 */
export function withoutEmptyFolders(open: Set<string>, nodes: TreeNode[]): Set<string> {
  if (open.size === 0) return open
  const empty = new Set<string>()
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.children?.length) walk(node.children)
      else empty.add(node.id)
    }
  }
  walk(nodes)
  const next = new Set([...open].filter((id) => !empty.has(id)))
  return next.size === open.size ? open : next
}
