import { useEffect } from 'react'
import { EDIT_TEXT_EVENT } from './board/tools'
import { useNarrow } from './useNarrow'
import Board from './board/Board'
import { fitView, stepZoom, zoomAt } from './board/view'
import { moved } from './board/tools'
import { newId, isShape, type ShapeItem } from './model/types'
import SidePanel from './panels/SidePanel'
import Toolbar, { TOOLS } from './panels/Toolbar'
import TopBar from './panels/TopBar'
import { commit, getState, redo, select, selected, setSettings, setSheet, setTool, setView, undo, useStore, withAdded, withMoved, withoutItem, withShape } from './store/store'

/** The keyboard: tools by their key, undo / redo, the selection (arrows, Delete, duplicate, order), colours, grid and zoom */
function useShortcuts() {
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const s = getState()
      const item = selected(s)
      if (ctrl && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (ctrl && key === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (ctrl && key === 'd' && item && isShape(item)) {
        e.preventDefault()
        const copy = { ...moved(item, 1, 1), id: newId(item.kind) } as ShapeItem
        commit(withAdded(s.drawing, [copy]))
        select(copy.id)
        return
      }
      if (ctrl) return
      if ((key === 'delete' || key === 'backspace') && item && isShape(item)) {
        e.preventDefault()
        commit(withoutItem(s.drawing, item.id))
        select(null)
        return
      }
      if (key.startsWith('arrow') && item && isShape(item)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
        commit(withShape(s.drawing, moved(item, dx, dy)))
        return
      }
      if ((e.key === '[' || e.key === ']') && item) {
        commit(withMoved(s.drawing, item.id, e.key === ']' ? 1 : -1))
        return
      }
      if (key === 'escape') return select(null)
      if (key === 'x') return setSettings({ main: s.settings.second, second: s.settings.main })
      if (e.key === "'") return setSettings({ grid: !s.settings.grid })
      const board = document.querySelector('.board')
      if ((e.key === '+' || e.key === '=' || e.key === '-') && board) {
        const r = board.getBoundingClientRect()
        return setView(zoomAt(s.view, stepZoom(s.view.zoom, e.key === '-' ? -1 : 1), r.width / 2, r.height / 2))
      }
      if (e.key === '0' && board) return setView(fitView(s.drawing.width, s.drawing.height, board.clientWidth, board.clientHeight))
      const tool = TOOLS.find((x) => x.key.toLowerCase() === key)
      if (tool) setTool(tool.tool)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
}

/** On phones, editing a text opens the sheet at its field (the keyboard comes up there) */
function useTextSheet(narrow: boolean) {
  useEffect(() => {
    if (!narrow) return
    const open = () => setSheet('selection')
    window.addEventListener(EDIT_TEXT_EVENT, open)
    return () => window.removeEventListener(EDIT_TEXT_EVENT, open)
  }, [narrow])
}

export default function App() {
  useShortcuts()
  const narrow = useNarrow()
  useTextSheet(narrow)
  const sheet = useStore((s) => s.sheet)
  return (
    <div className={`app ${narrow ? 'narrow' : ''} ${narrow && sheet ? 'with-sheet' : ''}`}>
      <TopBar />
      <Toolbar />
      <main className="stage">
        <Board />
      </main>
      <SidePanel />
    </div>
  )
}
