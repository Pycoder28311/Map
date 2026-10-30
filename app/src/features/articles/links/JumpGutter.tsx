import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from 'react'
import IconButton from '../../../components/ui/buttons/IconButton'
import type { ArticleText } from '../text/articleText'
import { linkedTargets, type JumpTarget } from './jumpTargets'
import { targetIcon } from './JumpPicker'

type Mark = { target: JumpTarget; count: number; top: number }

/**
 * The marks in the text's left margin: one beside each section or marked place that a Jump link goes to. Clicking one goes there;
 * its tooltip says how many links go to it. Placed from where the text is on screen (edited or static), again after every change and resize.
 * `box`: the element the marks are placed in (positioned, around the text)
 */
export default function JumpGutter({ text, box }: { text: ArticleText; box: RefObject<HTMLElement | null> }) {
  const [marks, setMarks] = useState<Mark[]>([])
  const [size, setSize] = useState(0)
  const version = useSyncExternalStore(text.subscribe, text.getVersion)

  useEffect(() => {
    const el = text.root
    if (!el) return
    const watcher = new ResizeObserver(() => setSize((n) => n + 1))
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [text])

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const origin = el.getBoundingClientRect().top
    setMarks(
      linkedTargets(text.doc()).flatMap(({ target, count }) => {
        // A section: its first line; a marked place: its own line
        const at = text.rectAt(Math.min(target.from + 1, text.doc().content.size))
        return at ? [{ target, count, top: (at.top + at.bottom) / 2 - origin }] : []
      }),
    )
  }, [text, box, version, size])

  return (
    <>
      {marks.map(({ target, count, top }) => (
        <div key={`${target.kind}:${target.from}`} style={{ top }} className="absolute -start-4 z-10 -translate-y-1/2">
          <IconButton
            icon={targetIcon(target)}
            label={`${target.text || 'Untitled section'} · ${count} ${count === 1 ? 'link goes' : 'links go'} here`}
            size="sm"
            className="size-4 min-h-0 min-w-0 [&>svg]:size-3!"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => text.goTo(target.kind === 'heading' ? target.from + 1 : target.from, target.kind === 'heading' ? target.end - 1 : target.end)}
          />
        </div>
      ))}
    </>
  )
}
