// The types of a line, an area and a shape (like the point's: pointLabels.ts), each with the Info box rows it starts with: its article's
// "main info" sections. Pure (infoTypes.test.ts).
import type { Infobox } from '@map/shared'
import { infoboxFrom, type Spec } from './pointInfo'
import type { BoardObject } from './types'

export type ObjectKindWithType = 'line' | 'border' | 'shape'
export type ObjectType = { id: string; name: string; rows: Spec[] }

/** No type: the first and the default, with no rows of its own in the Info box */
const NONE: ObjectType = { id: 'none', name: 'None', rows: [] }

export const OBJECT_TYPES: Record<ObjectKindWithType, ObjectType[]> = {
  line: [
    NONE,
    { id: 'road', name: 'Road', rows: [['value', 'Length'], ['value', 'Surface'], ['value', 'Speed limit']] },
    { id: 'river', name: 'River', rows: [['value', 'Length'], ['value', 'Source'], ['value', 'Mouth']] },
    { id: 'railway', name: 'Railway', rows: [['value', 'Length'], ['date', 'Opened'], ['value', 'Operator']] },
    { id: 'route', name: 'Route', rows: [['value', 'Length'], ['value', 'Duration'], ['value', 'Difficulty']] },
    { id: 'trail', name: 'Trail', rows: [['value', 'Length'], ['value', 'Difficulty'], ['value', 'Best season']] },
  ],
  border: [
    NONE,
    { id: 'country', name: 'Country', rows: [['value', 'Capital'], ['value', 'Population'], ['value', 'Area']] },
    { id: 'region', name: 'Region', rows: [['value', 'Population'], ['value', 'Area'], ['value', 'Seat']] },
    { id: 'district', name: 'District', rows: [['value', 'Population'], ['value', 'Area']] },
    { id: 'park', name: 'Park', rows: [['value', 'Area'], ['date', 'Established'], ['value', 'Protection']] },
    { id: 'water', name: 'Water body', rows: [['value', 'Area'], ['value', 'Depth'], ['value', 'Kind']] },
  ],
  shape: [
    NONE,
    { id: 'building', name: 'Building', rows: [['date', 'Built'], ['value', 'Architect'], ['value', 'Height'], ['value', 'Use']] },
    { id: 'landmark', name: 'Landmark', rows: [['date', 'Built'], ['value', 'Significance'], ['link', 'Website']] },
    { id: 'zone', name: 'Zone', rows: [['value', 'Area'], ['value', 'Use'], ['value', 'Owner']] },
    { id: 'field', name: 'Field', rows: [['value', 'Area'], ['value', 'Use'], ['value', 'Owner']] },
  ],
}

export const hasTypes = (o: BoardObject): o is BoardObject & { kind: ObjectKindWithType } => o.kind === 'line' || o.kind === 'border' || o.kind === 'shape'

/** The object's type: the one picked, else the first of its kind */
export function typeOfObject(o: BoardObject & { kind: ObjectKindWithType }): ObjectType {
  const types = OBJECT_TYPES[o.kind]
  return types.find((t) => t.id === o.articleType) ?? types[0]
}

/** The Info box an object's type starts with: its rows, empty (the same rows on every call) */
export const defaultObjectInfobox = (o: BoardObject & { kind: ObjectKindWithType }): Infobox => {
  const type = typeOfObject(o)
  return infoboxFrom(`${o.kind}-${type.id}`, type.rows)
}

/** The object's Info box: its own once it was changed, else its type's */
export const objectInfoboxOf = (o: BoardObject & { kind: ObjectKindWithType }): Infobox => o.infobox ?? defaultObjectInfobox(o)
