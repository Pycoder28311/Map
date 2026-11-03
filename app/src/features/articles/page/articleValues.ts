import { EMPTY_INFOBOX, type Infobox } from '@map/shared'
import { valuesOf, type FormValues } from '../../../lib/resource/changed'
import type { AnyResource } from '../../../resources/types'

/** The article's values for autosave: its form fields, and the Info box and the autolinkers as JSON text */
export const articleValues =
  (resource: AnyResource) =>
  (item: Record<string, unknown>): FormValues => ({
    ...valuesOf(resource, item),
    infobox: JSON.stringify(item.infobox ?? EMPTY_INFOBOX),
    // (a reader's copy has none: they never save)
    autolinkers: JSON.stringify(item.autolinkers ?? []),
  })

/** The changed values as the server takes them: the Info box and the autolinkers as JSON again */
export const articlePatch = (changed: FormValues): Record<string, unknown> => ({
  ...changed,
  ...(changed.infobox === undefined ? {} : { infobox: JSON.parse(changed.infobox) as Infobox }),
  ...(changed.autolinkers === undefined ? {} : { autolinkers: JSON.parse(changed.autolinkers) as unknown }),
})
