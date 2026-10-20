import type { Note, NoteFilter, NoteInput, NoteListItem, NoteUpdate, notesConfig } from '@map/shared'
import { LuStickyNote } from 'react-icons/lu'
import { createResourceApi } from '../../lib/api/resource'
import type { ResourceDefinition } from '../types'

/** The same flags as notesConfig.order (packages/shared/src/notes.ts); the type fails here if they ever differ */
export const NOTES_ORDER: typeof notesConfig.order = { pinned: true, position: true }

/** The notes table in the app: its calls, its names, its form fields, and the screens it shows up on */
export const notesResource: ResourceDefinition<Note, NoteListItem, NoteInput, NoteUpdate, NoteFilter> = {
  name: 'notes',
  panelType: 'note',
  api: createResourceApi<Note, NoteListItem, NoteInput, NoteUpdate, NoteFilter>('/api/notes'),
  // A written note goes into the lists in the server's order, without its content (the list's version of it)
  list: {
    order: NOTES_ORDER,
    toItem: ({ content: _content, ...item }) => item,
  },
  loadPanel: () => import('./NotePanel'),
  ui: {
    label: 'Note',
    plural: 'Notes',
    icon: LuStickyNote,
    untitled: 'Untitled note',
    fields: [
      { name: 'title', widget: 'text', placeholder: 'Title', heading: true },
      { name: 'content', widget: 'richText', label: 'Text', placeholder: 'Take a note…' },
    ],
    row: {
      title: (note) => note.title.trim() || 'Untitled note',
      subtitle: (note) => note.preview || undefined,
      pinned: (note) => note.pinned,
    },
  },
  surfaces: { sidebar: { limit: 5 }, page: '/notes', panel: true, search: true, recent: true, trash: true, dashboard: true, quickCreate: true },
}
