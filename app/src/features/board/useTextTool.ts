// The Text tool: a click starts text that grows as it is typed, a drag a box that wraps, a click on a text edits it. The
// words are typed in the in-place editor (TextEditorOverlay); finishing makes one change (one undo step). Inside an unnamed
// area a new text is that area's name. Pure parts: drawText.ts, areaName.ts.
import { useRef, useState } from 'react'
import { addObject, changeObjects } from './boardStore'
import { areaToName, textAt, textFromGesture } from './drawText'
import { newNameText, runsPatch, textChange } from './areaName'
import { getTextPen } from './pen'
import { HIT_PX } from './useMouseTool'
import { insideBoard, screenToBoard, type Viewport } from './viewport'
import { select } from './selection'
import type { Board, Point, TextObject, TextRun } from './types'
import { LAYER_MAIN } from './types'

type Props = { mapId: string; board: Board; view: Viewport | null }

/** A text being edited: a new one that is not in the board yet (`draft`), or one that is (`id`) */
export type Editing = { id: number | null; draft: TextObject }

export function useTextTool({ mapId, board, view }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const drag = useRef<{ from: Point; to: Point } | null>(null)
  const [box, setBox] = useState<{ from: Point; to: Point } | null>(null)
  const area = useRef<number | null>(null)

  const edit = (text: TextObject) => {
    area.current = null
    setNotice(null)
    setEditing({ id: text.id, draft: text })
  }

  /** A press with the Text tool. True when the pointer now holds a drag (a box being sized) */
  const begin = (at: Point): boolean => {
    if (!view) return false
    const p = screenToBoard(view, at)
    const existing = textAt(board, p, HIT_PX / view.scale)
    if (existing) {
      edit(existing)
      return false
    }
    if (!insideBoard(p)) return false
    drag.current = { from: p, to: p }
    setBox(null)
    return true
  }

  const move = (at: Point) => {
    if (!view || !drag.current) return
    drag.current.to = screenToBoard(view, at)
    setBox({ ...drag.current })
  }

  /** The press ended: start the text (a click or a drag) */
  const end = () => {
    const g = drag.current
    drag.current = null
    setBox(null)
    if (!g) return
    const made = textFromGesture(g.from, g.to, getTextPen())
    const target = areaToName(board, g.from)
    area.current = target ? target.id : null
    setNotice(null)
    // Inside an unnamed area it is the area's name: it starts where the name goes, in its look (committing centres it)
    setEditing({ id: null, draft: { ...(target ? newNameText(target, '') : made), id: 0 } as TextObject })
  }

  /** The words are done: add, change, or (when empty) drop */
  const commit = (runs: TextRun[]) => {
    const current = editing
    setEditing(null)
    if (!current) return
    const fields = runsPatch(runs)
    if (current.id !== null) {
      const existing = board.objects.find((o): o is TextObject => o.id === current.id)
      if (existing) changeObjects(mapId, textChange(existing, fields))
      return
    }
    const target = area.current === null ? null : board.objects.find((o) => o.id === area.current && o.kind === 'border')
    area.current = null
    if (target && target.kind === 'border') {
      // The first text inside an unnamed area names it
      const words = (fields.text ?? '').trim()
      const named = newNameText(target, words)
      const [id] = changeObjects(mapId, {
        add: [{ ...named, runs: fields.runs, text: fields.text ?? words }],
        update: [{ id: target.id, patch: { name: words } }],
      })
      if (id !== undefined) select(mapId, [id])
      setNotice(`Used as the name of this area: “${words}”.`)
      return
    }
    const { id: _id, ...draft } = current.draft
    void _id
    const id = addObject(mapId, { ...draft, ...fields, layer: LAYER_MAIN })
    select(mapId, [id])
  }

  const cancel = () => {
    setEditing(null)
    drag.current = null
    area.current = null
    setBox(null)
  }

  return { editing, notice, box, begin, move, end, edit, commit, cancel, dismissNotice: () => setNotice(null) }
}
