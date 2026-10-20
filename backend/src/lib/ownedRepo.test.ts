import { DATA, TABLE_NAMES } from '@map/shared'
import * as schema from '../db/schema'
import { ownedRepo } from './ownedRepo'
import { describeOwnedRepo } from './ownedRepo.suite'

// Every table of the data config passes the same tests (ownedRepo.suite.ts)
for (const name of TABLE_NAMES) describeOwnedRepo(name, ownedRepo(schema[name], DATA[name]) as never)
