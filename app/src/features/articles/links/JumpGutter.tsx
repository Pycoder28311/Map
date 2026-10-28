import type { Editor } from '@tiptap/react'
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import IconButton from '../../../components/ui/buttons/IconButton'
import { linkedTargets, type JumpTarget } from './jumpTargets'
import { targetIcon } from './JumpPicker'
import { goTo } from './linkExtensions'

type Mark = { target: JumpTarget; count: number; top: number }

/**
 * The marks in the text's left margin: one beside each section or marked place that a Jump link goes to. Clicking one goes there;
 * its tooltip says how many links go to it. Placed from the editor's own coordinates, again after every change and resize.
 * `box`: the element the marks are placed in (positioned, around the text)
 */
export default function JumpGutter({ editor, box }: { editor: Editor; box: RefObject<HTMLElement | null> }) {
  const [marks, setMarks] = useState<Mark[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const redo = () => setVersion((v) => v + 1)
    editor.on('update', redo)
    const watcher = new ResizeObserver(redo)
    watcher.observe(editor.view.dom)
    return () => {
      editor.off('update', redo)
      watcher.disconnect()
    }
  }, [editor])

  useLayoutEffect(() => {
    const el = box.current
    if (!el || editor.isDestroyed) return
    const origin = el.getBoundingClientRect().top
    setMarks(
      linkedTargets(editor.state.doc).map(({ target, count }) => {
        // A section: its first line; a marked place: its own line
        const at = editor.view.coordsAtPos(Math.min(target.from + 1, editor.state.doc.content.size))
        return { target, count, top: (at.top + at.bottom) / 2 - origin }
      }),
    )
  }, [editor, box, version])

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
            onClick={() => goTo(editor, target.kind === 'heading' ? target.from + 1 : target.from, target.kind === 'heading' ? target.end - 1 : target.end)}
          />
        </div>
      ))}
    </>
  )
}
