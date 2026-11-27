// The drawing and the settings are kept in this browser (localStorage) a second after each change, and read at start. Nothing leaves the
// browser: there is no server.
import { deserializeDrawing, serializeDrawing } from '../export/dataFile'
import { getState, hydrate, subscribe, type Settings } from './store'

const DRAWING_KEY = 'pixel-board:drawing'
const SETTINGS_KEY = 'pixel-board:settings'

/** Reads what was kept; a drawing that can't be read: an empty board, and a message */
export function restore() {
  let notice: string | null = null
  let drawing = null
  let settings: Partial<Settings> | undefined
  try {
    const text = localStorage.getItem(DRAWING_KEY)
    if (text) {
      drawing = deserializeDrawing(JSON.parse(text))
      if (!drawing) notice = 'The saved drawing could not be read: starting with an empty board.'
    }
    const s = localStorage.getItem(SETTINGS_KEY)
    if (s) settings = JSON.parse(s) as Partial<Settings>
  } catch {
    notice = 'The saved drawing could not be read: starting with an empty board.'
  }
  hydrate({ ...(drawing ? { drawing } : {}), ...(settings ? { settings: settings as Settings } : {}) }, notice)
}

/** Keeps the drawing and the settings a second after the last change */
export function keepSaving() {
  let timer = 0
  let last = getState()
  return subscribe(() => {
    const s = getState()
    // Any change (a stroke paints in place, in the same drawing object, but its `version` changes); a second of quiet, then kept
    if (s.version === last.version) return
    last = s
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAWING_KEY, JSON.stringify(serializeDrawing(getState().drawing)))
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(getState().settings))
      } catch {
        // Too many colours for a data file, or storage full / blocked: kept until the page is closed
      }
    }, 1000)
  })
}
