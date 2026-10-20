// Which fields of an edit form differ from what the server has. Pure (changed.test.ts).

export type FormValues = Record<string, string>

/** Only the fields whose value is not the saved one: what a PATCH needs to send */
export function changedFields(next: FormValues, saved: FormValues): FormValues {
  return Object.fromEntries(Object.entries(next).filter(([name, value]) => value !== saved[name]))
}

/** Whether two sets of values are the same */
export function sameValues(a: FormValues, b: FormValues): boolean {
  const names = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...names].every((name) => (a[name] ?? '') === (b[name] ?? ''))
}

/** The values of a form for an item: the resource's fields as text (a missing one is empty) */
export const valuesOf = (resource: { ui: { fields: { name: string }[] } }, item: Record<string, unknown>): FormValues =>
  Object.fromEntries(resource.ui.fields.map((field) => [field.name, String(item[field.name] ?? '')]))
