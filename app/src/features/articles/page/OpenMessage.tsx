import { removeArticleLink } from '../links/linkExtensions'
import MessagePanel from '../links/MessagePanel'
import type { ArticleText } from '../text/articleText'
import type { MessagePanelState } from './useMessagePanel'

type Props = {
  /** The open message and its controls (useMessagePanel) */
  panel: MessagePanelState
  text: ArticleText
  articleId: number
  canEdit: boolean
  /** Its Edit: the links row's Message popout opens on its words */
  onEditLink: () => void
}

/** The message open beside the text (MessagePanel), with Edit and Remove link going through the text */
export default function OpenMessage({ panel, text, articleId, canEdit, onEditLink }: Props) {
  const { message, setMessage, hoverMessage, cancelClose } = panel
  if (!message) return null
  return (
    // (the pointer on the panel keeps it open while it was opened by hovering; once something in it has the focus, a reply being
    // written, it stays open as if clicked)
    <div
      className="contents"
      data-message-panel
      onPointerEnter={cancelClose}
      onPointerLeave={() => message.hover && hoverMessage(null)}
      onFocus={() => message.hover && setMessage({ ...message, hover: false })}
    >
      <MessagePanel
        key={`${message.id}:${message.from}`}
        id={message.id}
        legacy={message.legacy}
        words={message.words}
        articleId={articleId}
        canEditArticle={canEdit}
        top={message.top}
        textRight={message.textRight}
        anchor={message.anchor}
        onClose={() => setMessage(null)}
        onEdit={() =>
          void text.open({ from: message.from, to: message.to }).then(() => {
            setMessage(null)
            onEditLink()
          })
        }
        onRemoveLink={() =>
          void text.open({ from: message.from, to: message.to }).then((ed) => {
            if (ed) removeArticleLink(ed)
            setMessage(null)
          })
        }
      />
    </div>
  )
}
