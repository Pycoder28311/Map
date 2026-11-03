import { useState, type RefObject } from 'react'
import { useTimeout } from '../../../lib/useTimeout'
import { linkAt, type LinkRange } from '../links/docLinks'
import type { ArticleText } from '../text/articleText'
import { INFO_GAP, MESSAGE_HOVER_CLOSE_MS } from './pageConfig'

/**
 * The message open beside the text: its id (null: an old one, its text in the link), its words and where it opens (`hover`: opened by the
 * pointer resting on its words, it closes when the pointer leaves them and its panel)
 */
export type OpenedMessage = {
  id: number | null
  legacy?: { title: string; content: string }
  words: string
  from: number
  to: number
  top: number
  textRight: number
  anchor?: { x: number; y: number }
  hover?: boolean
}

/**
 * The message open beside the text. `textBox`: the box around the text, which its panel is placed in; `infoBox`: the Info box the text
 * flows around (the panel goes right of where the text's lines end)
 */
export function useMessagePanel(text: ArticleText, textBox: RefObject<HTMLElement | null>, infoBox: RefObject<HTMLElement | null>) {
  const [message, setMessage] = useState<OpenedMessage | null>(null)
  const { set: laterClose, clear: cancelClose } = useTimeout()

  /** Opens a message beside the text, level with its words (`el`: the link's element, found from the text when not given) */
  const openMessage = (range: LinkRange, el?: HTMLElement | null, hover = false) => {
    if (range.link.kind !== 'msg') return
    const box = textBox.current?.getBoundingClientRect()
    // The words' last line: the element's own rect, or where the words end in the text
    const end = el?.getBoundingClientRect() ?? text.rectAt(range.to - 1)
    const start = el?.getBoundingClientRect() ?? text.rectAt(range.from + 1)
    const top = (start?.top ?? 0) - (box?.top ?? 0)
    const anchor = end && box ? { x: ('right' in end ? end.right : end.left) - box.left, y: (end.top + end.bottom) / 2 - box.top } : undefined
    // Where the text's lines end at the words' height: before the Info box when it is beside them (the text flows round it, ms-4), else the box's right
    const info = infoBox.current?.getBoundingClientRect()
    const besideInfo = !!info && !!start && !!end && start.top < info.bottom && end.bottom > info.top
    const textRight = box ? (besideInfo ? info!.left - INFO_GAP : box.right) - box.left : 0
    setMessage({ id: range.link.id, legacy: range.link.legacy, words: range.text, from: range.from, to: range.to, top: Math.max(0, top), textRight, anchor, hover })
  }

  /** The pointer rests on a message's words (`el`), or has left them (null): its panel opens, and closes shortly after the pointer left both */
  const hoverMessage = (el: HTMLElement | null) => {
    if (!el) return laterClose(() => setMessage((open) => (open?.hover ? null : open)), MESSAGE_HOVER_CLOSE_MS)
    cancelClose()
    const pos = text.posAtDom(el, 0)
    const range = pos === null ? null : linkAt(text.doc(), pos + 1)
    if (range) openMessage(range, el, true)
  }

  return { message, setMessage, openMessage, hoverMessage, cancelClose }
}

export type MessagePanelState = ReturnType<typeof useMessagePanel>
