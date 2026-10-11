import { describe, expect, it } from 'vitest'
import { stickToEdges } from './barPopoutEdges'

const bounds = { left: 224, right: 1000 }

describe('stickToEdges', () => {
  it('keeps a popout away from the edges where it is', () => {
    expect(stickToEdges({ left: 400, right: 600 }, bounds, 32)).toEqual({
      span: { left: 400, right: 600 },
      stuck: { start: false, end: false },
    })
  })

  it('snaps to the right edge within the threshold or past it', () => {
    const near = stickToEdges({ left: 770, right: 970 }, bounds, 32)
    expect(near).toEqual({ span: { left: 800, right: 1000 }, stuck: { start: false, end: true } })
    expect(stickToEdges({ left: 850, right: 1050 }, bounds, 32).span).toEqual({ left: 800, right: 1000 })
    expect(stickToEdges({ left: 760, right: 960 }, bounds, 32).stuck.end).toBe(false)
  })

  it('snaps to the sidebar edge within the threshold or past it', () => {
    expect(stickToEdges({ left: 250, right: 450 }, bounds, 32)).toEqual({
      span: { left: 224, right: 424 },
      stuck: { start: true, end: false },
    })
    expect(stickToEdges({ left: 100, right: 300 }, bounds, 32).span).toEqual({ left: 224, right: 424 })
    expect(stickToEdges({ left: 260, right: 460 }, bounds, 32).stuck.start).toBe(false)
  })

  it('sticks to the window edge when the sidebar takes no space', () => {
    expect(stickToEdges({ left: 10, right: 210 }, { left: 0, right: 400 }, 32).span).toEqual({ left: 0, right: 200 })
  })

  it('sticks on both sides when wider than the bounds', () => {
    expect(stickToEdges({ left: 0, right: 900 }, bounds, 32)).toEqual({
      span: { left: 224, right: 1000 },
      stuck: { start: true, end: true },
    })
  })
})
