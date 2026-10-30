import { useEffect, useState } from 'react'
import { LuChevronDown, LuChevronRight, LuHash, LuListTree } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import { jumpTargets } from '../links/jumpTargets'
import { sameJson, useTextState, type ArticleText } from '../text/articleText'
import { contentsTree, type ContentsNode } from './contentsTree'

/** How far under the top of the window a heading counts as the one being read (px) */
const READING_LINE = 120

/** Which heading (by its place among the headings) is the one being read: the last one above the reading line */
function useCurrentHeading(text: ArticleText) {
  const [current, setCurrent] = useState(-1)
  useEffect(() => {
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // The headings in the order of the text: the static parts' and the editor's alike
        const headings = text.root?.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? []
        let at = -1
        headings.forEach((h, i) => {
          if (h.getBoundingClientRect().top < READING_LINE) at = i
        })
        setCurrent(at)
      })
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    const unsubscribe = text.subscribe(measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      unsubscribe()
    }
  }, [text])
  return current
}

/**
 * Contents: the article's sections (its headings) as a tree, a section's subsections under it (folded with its arrow). Clicking one goes
 * there; the one being read is marked. It follows the text as it is written
 */
export default function ContentsTree({ text }: { text: ArticleText }) {
  const nodes = useTextState(text, (doc) => contentsTree(jumpTargets(doc)), sameJson)
  const current = useCurrentHeading(text)
  const [folded, setFolded] = useState<Set<number>>(new Set())

  const row = (node: ContentsNode, depth: number) => {
    const { heading } = node
    const isFolded = folded.has(heading.index)
    return (
      <li key={heading.index}>
        <div className="flex items-center" style={{ paddingInlineStart: `${depth * 0.75}rem` }}>
          {node.children.length > 0 ? (
            <IconButton
              icon={isFolded ? LuChevronRight : LuChevronDown}
              label={isFolded ? `Show the sections of ${heading.text || 'this section'}` : `Fold ${heading.text || 'this section'}`}
              size="sm"
              aria-expanded={!isFolded}
              onClick={() => {
                const next = new Set(folded)
                if (isFolded) next.delete(heading.index)
                else next.add(heading.index)
                setFolded(next)
              }}
            />
          ) : (
            <span aria-hidden className="w-7 shrink-0" />
          )}
          <Button
            variant={current === heading.index ? 'selected' : 'ghost'}
            size="sm"
            plain
            icon={LuHash}
            aria-current={current === heading.index ? 'location' : undefined}
            className="min-w-0 flex-1 justify-start"
            onClick={() => text.goTo(heading.from + 1, heading.end - 1)}
          >
            <span className="min-w-0 truncate text-start">{heading.text || <span className="text-fg-subtle">Untitled section</span>}</span>
          </Button>
        </div>
        {node.children.length > 0 && !isFolded && <ul>{node.children.map((child) => row(child, depth + 1))}</ul>}
      </li>
    )
  }

  return (
    <nav aria-label="Contents" className="flex flex-col gap-1 rounded-(--card-radius) border border-line bg-surface p-2 shadow-sm">
      <h2 className="flex items-center gap-1.5 px-1 text-small font-medium text-fg-muted">
        <LuListTree className="size-4" />
        Contents
      </h2>
      {nodes.length === 0 ? <p className="px-1 text-small text-fg-subtle">Add headings (the toolbar’s Add section, or type / in the text) to see them here.</p> : <ul>{nodes.map((n) => row(n, 0))}</ul>}
    </nav>
  )
}
