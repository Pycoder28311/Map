// Number inputs you can scrub: with the pointer over one it is the double-arrow cursor (CSS in index.css), and holding the mouse
// down on it and moving sideways changes the number. A press that does not move is a click: the input gets the focus to type in.
// Installed once for the whole page, so every number input has it. The number's step and limits are the input's own.

/** How far (px) the pointer must move before a press is a scrub rather than a click */
const START = 3
/** How many px of movement make one step of the input (a step bigger than 1 takes more, so a coarse input is not flung) */
const pxPerStep = (step: number) => (step > 1 ? 12 : 5)

/** The value the pointer's movement `dx` (px) gives from `start`, a step at a time and inside the input's limits */
export function scrubbedValue(start: number, dx: number, step: number, min: number, max: number) {
  const steps = Math.trunc(dx / pxPerStep(step))
  const decimals = (String(step).split('.')[1] ?? '').length
  const next = Number((start + steps * step).toFixed(decimals))
  return Math.min(max, Math.max(min, next))
}

const isScrubbable = (t: EventTarget | null): t is HTMLInputElement =>
  t instanceof HTMLInputElement && t.type === 'number' && !t.disabled && !t.readOnly && document.activeElement !== t

let installed = false

export function installNumberScrub() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!

  document.addEventListener(
    'pointerdown',
    (down) => {
      const input = down.target
      if (down.button !== 0 || down.pointerType !== 'mouse' || !isScrubbable(input)) return
      // Not focusing it yet: a click will, a scrub never does
      down.preventDefault()
      const x0 = down.clientX
      const start = Number(input.value) || 0
      const step = Number(input.step) > 0 ? Number(input.step) : 1
      const min = input.min === '' ? -Infinity : Number(input.min)
      const max = input.max === '' ? Infinity : Number(input.max)
      let scrubbing = false

      const move = (e: PointerEvent) => {
        const dx = e.clientX - x0
        if (!scrubbing && Math.abs(dx) < START) return
        if (!scrubbing) {
          scrubbing = true
          // Tells the field its value is on its way: it keeps it until the scrub ends (one change, not one per step)
          input.dataset.scrubbing = '1'
          input.setPointerCapture(e.pointerId)
          document.documentElement.style.cursor = 'ew-resize'
          document.documentElement.style.userSelect = 'none'
        }
        const next = scrubbedValue(start, dx, step, min, max)
        if (String(next) === input.value) return
        setValue.call(input, String(next))
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const end = () => {
        input.removeEventListener('pointermove', move)
        input.removeEventListener('pointerup', end)
        input.removeEventListener('pointercancel', end)
        document.documentElement.style.cursor = ''
        document.documentElement.style.userSelect = ''
        if (scrubbing) {
          // Leaving the field is what makes it keep the value
          delete input.dataset.scrubbing
          input.focus({ preventScroll: true })
          input.blur()
        } else {
          input.focus()
          input.select()
        }
      }
      input.addEventListener('pointermove', move)
      input.addEventListener('pointerup', end)
      input.addEventListener('pointercancel', end)
      // The press is taken over the whole page, not just the input (it can leave it while moving)
      input.setPointerCapture(down.pointerId)
    },
    true,
  )
}
