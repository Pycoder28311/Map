// A character that opens a menu while typing (the article's `/` for sections and `@` for links): typed at the start of a row or after a
// space, it opens; what is typed after it is the menu's query; a space, Esc, the caret leaving or the character being deleted closes it.
// The menu itself is the caller's: it is told where the character is and what was typed (and may take the menu keys).
import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { RefObject } from 'react'

/** The typed character and its query: from the character (`from`) to the caret (`to`), in the editor's document */
export type TriggerMatch = { from: number; to: number; query: string; rect: () => { left: number; top: number; bottom: number } }

export type TriggerHandlers = {
  /** Opened, or the query changed */
  onChange: (match: TriggerMatch) => void
  onClose: () => void
  /** A key pressed while it is open: true when the menu used it (↑ ↓ Enter) */
  onKey?: (event: KeyboardEvent) => boolean
}

/** The longest query: past it the character was only a character */
const MAX_QUERY = 40

/** Whether a character typed after `before` (the row's text up to the caret) opens a menu: at the row's start or after a space */
export const opensAt = (before: string) => before === '' || /\s$/.test(before)

/** The query after the character, or null when it is not one any more (a space in it, or too long) */
export function queryOf(after: string): string | null {
  return /\s/.test(after) || after.length > MAX_QUERY ? null : after
}

const keys = new Map<string, PluginKey<{ from: number } | null>>()
const keyOf = (char: string) => {
  let key = keys.get(char)
  if (!key) keys.set(char, (key = new PluginKey(`typeTrigger:${char}`)))
  return key
}

/** Where the open menu's character is (null: closed) */
const openAt = (state: EditorState, char: string) => keyOf(char).getState(state) ?? null

/** Closes the character's menu (its X, or a pick that keeps the character) */
export function closeTypeTrigger(editor: Editor, char: string) {
  if (!editor.isDestroyed && openAt(editor.state, char)) editor.view.dispatch(editor.state.tr.setMeta(keyOf(char), { close: true }))
}

function matchOf(view: EditorView, from: number): TriggerMatch {
  const to = view.state.selection.head
  return { from, to, query: view.state.doc.textBetween(from + 1, to), rect: () => view.coordsAtPos(from) }
}

/** The extension for one character; `handlers` is read when something happens, so it can change */
export function typeTrigger(char: string, handlers: RefObject<TriggerHandlers>) {
  const key = keyOf(char)
  return Extension.create({
    name: `typeTrigger${char.codePointAt(0)}`,
    addProseMirrorPlugins() {
      return [
        new Plugin<{ from: number } | null>({
          key,
          state: {
            init: () => null,
            apply(tr, value, _old, state) {
              const meta = tr.getMeta(key) as { open?: number; close?: boolean } | undefined
              if (meta?.close) return null
              const open = meta?.open !== undefined ? { from: meta.open } : value
              if (!open) return null
              const from = meta?.open !== undefined ? open.from : tr.mapping.map(open.from)
              const { selection, doc } = state
              if (!selection.empty || selection.head <= from || from >= doc.content.size) return null
              if (doc.textBetween(from, from + 1) !== char || doc.resolve(from).start() !== selection.$head.start()) return null
              return queryOf(doc.textBetween(from + 1, selection.head)) === null ? null : { from }
            },
          },
          props: {
            handleTextInput(view, from, to, text) {
              if (text !== char || !view.editable || openAt(view.state, char)) return false
              const $from = view.state.doc.resolve(from)
              if (!opensAt($from.parent.textBetween(0, $from.parentOffset, undefined, '￼'))) return false
              view.dispatch(view.state.tr.insertText(text, from, to).setMeta(key, { open: from }))
              return true
            },
            handleKeyDown(view, event) {
              if (!openAt(view.state, char)) return false
              if (event.key === 'Escape') {
                view.dispatch(view.state.tr.setMeta(key, { close: true }))
                return true
              }
              return handlers.current?.onKey?.(event) ?? false
            },
          },
          view: () => ({
            update(view, before) {
              const now = openAt(view.state, char)
              const was = openAt(before, char)
              if (!now) {
                if (was) handlers.current?.onClose()
                return
              }
              if (!was || view.state.doc !== before.doc || !view.state.selection.eq(before.selection)) handlers.current?.onChange(matchOf(view, now.from))
            },
            destroy() {
              handlers.current?.onClose()
            },
          }),
        }),
      ]
    },
  })
}
