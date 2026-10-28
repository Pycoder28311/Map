// The article's Contents: its sections (headings) as a tree, a heading inside the last one of a higher level before it.
// Pure (contentsTree.test.ts).
import type { JumpTarget } from '../links/jumpTargets'

type Heading = Extract<JumpTarget, { kind: 'heading' }>
export type ContentsNode = { heading: Heading; children: ContentsNode[] }

export function contentsTree(targets: JumpTarget[]): ContentsNode[] {
  const roots: ContentsNode[] = []
  const open: ContentsNode[] = []
  for (const target of targets) {
    if (target.kind !== 'heading') continue
    const node = { heading: target, children: [] }
    while (open.length && open[open.length - 1].heading.level >= target.level) open.pop()
    const parent = open.at(-1)
    if (parent) parent.children.push(node)
    else roots.push(node)
    open.push(node)
  }
  return roots
}
