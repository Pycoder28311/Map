// The board's file on the server (docs/plans/38): read once, Save writes it, unsaved = not the saved board
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/client'
import { POINT_DEFAULT } from './pointLabels'
import type { Board } from './types'

const api = vi.hoisted(() => ({ getMapFile: vi.fn(), saveMapFile: vi.fn() }))
vi.mock('../../lib/api/maps', () => api)
// The file is the board itself here (no brotli in the tests)
vi.mock('../projects/compress', () => ({
  boardToFile: async (board: Board) => new Blob([JSON.stringify(board)]),
  boardFromFile: async (file: Blob) => JSON.parse(await file.text()) as Board,
}))

const store = await import('./boardStore')
const { addObject, getBoard, isDirty, loadBoard, MapConflict, resetBoards, saveBoard, saveOver, takeServers, undo } = store

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const point = { kind: 'point' as const, name: '', links: [], anchor: { x: 1, y: 2 }, ...POINT_DEFAULT }
const fileOf = (board: Board) => new Blob([JSON.stringify(board)])
const sent = async (call: number) => JSON.parse(await (api.saveMapFile.mock.calls[call][1] as Blob).text()) as Board

beforeEach(() => {
  vi.clearAllMocks()
  resetBoards()
})

describe('a map\'s file', () => {
  it('is read once (two calls are one request); a map never saved is an empty board', async () => {
    api.getMapFile.mockResolvedValue({ file: null, version: 0 })
    void loadBoard('1')
    void loadBoard('1')
    await flush()
    await loadBoard('1')
    expect(api.getMapFile).toHaveBeenCalledTimes(1)
    expect(getBoard('1').objects).toEqual([])
    expect(isDirty('1')).toBe(false)
  })

  it('a change is unsaved until Save; undoing back to the saved board is saved again', async () => {
    api.getMapFile.mockResolvedValue({ file: null, version: 0 })
    await loadBoard('2')
    addObject('2', point)
    expect(isDirty('2')).toBe(true)
    undo('2')
    expect(isDirty('2')).toBe(false)
    addObject('2', point)
    api.saveMapFile.mockResolvedValue({ version: 1, savedAt: '' })
    await saveBoard('2')
    expect(api.saveMapFile).toHaveBeenCalledWith('2', expect.any(Blob), 0)
    expect((await sent(0)).objects).toHaveLength(1)
    expect(isDirty('2')).toBe(false)
  })

  it('reads the saved file back, and saves over the version it read', async () => {
    api.getMapFile.mockResolvedValue({ file: fileOf({ nextId: 2, objects: [{ ...point, id: 1, layer: 1 }] }), version: 4 })
    await loadBoard('3')
    expect(getBoard('3').objects).toHaveLength(1)
    addObject('3', point)
    api.saveMapFile.mockResolvedValue({ version: 5, savedAt: '' })
    await saveBoard('3')
    expect(api.saveMapFile).toHaveBeenLastCalledWith('3', expect.any(Blob), 4)
  })

  it('a conflict says the newer version: Save mine over it, or take the saved one', async () => {
    api.getMapFile.mockResolvedValue({ file: null, version: 1 })
    await loadBoard('4')
    addObject('4', point)
    api.saveMapFile.mockRejectedValueOnce(new ApiError(409, 'CONFLICT', 'Newer', [{ path: 'version', message: '3' }]))
    const error = await saveBoard('4').catch((e) => e)
    expect(error).toBeInstanceOf(MapConflict)
    expect(error.version).toBe(3)
    expect(isDirty('4')).toBe(true)
    api.saveMapFile.mockResolvedValueOnce({ version: 4, savedAt: '' })
    await saveOver('4', 3)
    expect(api.saveMapFile).toHaveBeenLastCalledWith('4', expect.any(Blob), 3)
    expect(isDirty('4')).toBe(false)
    addObject('4', point)
    api.getMapFile.mockResolvedValue({ file: null, version: 4 })
    await takeServers('4')
    expect(getBoard('4').objects).toEqual([])
    expect(isDirty('4')).toBe(false)
  })

  it('a deleted map is gone; another failure can be tried again', async () => {
    api.getMapFile.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Not found'))
    await loadBoard('5')
    api.getMapFile.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'Offline')).mockResolvedValueOnce({ file: null, version: 0 })
    await loadBoard('6')
    await loadBoard('6')
    expect(api.getMapFile).toHaveBeenCalledTimes(3)
    expect(getBoard('6').objects).toEqual([])
  })
})
