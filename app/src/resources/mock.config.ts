// MOCK DATA: tables that have no table on the server yet, described like the real ones (packages/shared/src/data.config.ts) and kept in
// memory by createMockApi (lib/api/mockApi.ts). Their resources work like every other; moving one to the server is moving its entry
// to the data config (and its seed away). Nothing is saved: a reload starts again from the seed.
import { defineTables, field } from '@map/shared'

export const MOCK_DATA = defineTables({
  maps: {
    access: 'owner',
    order: { pinned: true, position: true },
    // branchOf: the first map of its branch group (0: not a branch); see features/board/branches.ts
    fields: { title: field.text(200), branchOf: field.int() },
    requireOneOf: ['title'],
  },
})

export type MockTableName = keyof typeof MOCK_DATA
export const MOCK_TABLE_NAMES = Object.keys(MOCK_DATA) as MockTableName[]

/** What each mock table starts with on every reload */
export const MOCK_SEED: Record<MockTableName, Record<string, unknown>[]> = {
  maps: [{ title: 'Parks overview' }, { title: 'Playgrounds' }, { title: 'North routes' }, { title: 'South routes' }, { title: 'Offices' }],
}
