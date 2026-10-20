import type { Table } from '@map/shared'
import { createElement, type ComponentType } from 'react'
import { createResourceApi, type ResourceApi } from '../lib/api/resource'
import type { PanelProps } from '../features/workspace/types'
import type { ResourceUi } from './resources.config'
import type { AnyField, AnyResource, FieldWidget } from './types'

type Item = Record<string, unknown> & { id: number | string }

/** The form widget of each field kind (fields.ts); the others (numbers, flags) have none unless the UI config gives one */
const WIDGET_OF: Partial<Record<string, FieldWidget>> = { text: 'text', plainText: 'textarea', richText: 'richText' }

/**
 * A table's resource, from its two configs: the data one (its fields, order, link, preview: shared/src/data.config.ts) and the UI one
 * (names, icon, screens: resources.config.ts). It holds the API calls (`/api/<path>`, or `api` for a mock), the form fields, how a
 * row is named, how a written item goes into the cached lists, and the panel. Nothing here is table-specific.
 */
export function createResource(table: Table, ui: ResourceUi, api?: ResourceApi<Item, Item, Record<string, unknown>, Record<string, unknown>, { archived: boolean }>): AnyResource {
  const fields: AnyField[] = Object.entries(table.fields).flatMap(([name, f]) => {
    const own = ui.fields?.[name] ?? {}
    const widget = own.widget ?? WIDGET_OF[f.kind]
    if (own.hidden || !widget) return []
    return [{ name, widget, label: own.label, placeholder: own.placeholder }]
  })
  // The first one-line text field is the heading (the title)
  const heading = fields.find((f) => f.widget === 'text')
  if (heading) heading.heading = true
  const titleField = heading?.name
  // A list's line under the title: the preview, else the first plain text field (a folder's description)
  const subtitleField = table.preview ? 'preview' : fields.find((f) => f.widget === 'textarea')?.name

  const resource: AnyResource = {
    name: table.name,
    panelType: ui.panelType,
    api: api ?? createResourceApi(`/api/${table.path}`),
    // A written item goes into the lists in the server's order, without the field its preview stands for
    list: {
      order: table.order,
      toItem: (item) => {
        if (!table.preview) return item
        const { [table.preview]: _heavy, ...rest } = item
        return rest as Item
      },
    },
    loadPanel:
      ui.panel?.load ??
      (() =>
        import('../components/ui/resource/ResourcePanel').then(({ default: ResourcePanel }) => ({
          default: ((props: PanelProps) => createElement(ResourcePanel, { resource, ...props })) as ComponentType<PanelProps>,
        }))),
    fillPanel: ui.panel?.fill,
    customPanel: ui.panel !== undefined,
    linked: table.link !== undefined,
    effects: ui.effects,
    ui: {
      label: ui.label,
      plural: ui.plural,
      icon: ui.icon,
      untitled: ui.untitled,
      pageDescription: ui.pageDescription,
      card: ui.card,
      fields: fields as AnyResource['ui']['fields'],
      row: {
        title: (item) => (titleField ? String(item[titleField] ?? '').trim() : '') || ui.untitled,
        subtitle: (item) => (subtitleField ? String(item[subtitleField] ?? '') || undefined : undefined),
        pinned: table.order.pinned ? (item) => item.pinned === true : undefined,
      },
    },
    surfaces: { ...ui.surfaces, page: ui.surfaces.page ? `/${table.path}` : undefined },
  }
  return resource
}
