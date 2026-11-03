import { useEffect, type RefObject } from 'react'
import { openInNewTab } from '../../../lib/urls'
import { personById, type Person } from '../../people/mockPeople'
import { useWorkspace } from '../../workspace/useWorkspace'
import type { AutoRule } from '../links/autolink'
import { resolveJump } from '../links/jumpTargets'
import type { LinkHandlers } from '../links/linkExtensions'
import type { ArticleText } from '../text/articleText'

/**
 * What a click on one of the article's links does: written into `handlers` after every render (linkExtensions.ts reads it when it
 * happens, so it always sees this render's state)
 */
export function useLinkHandlers(
  handlers: RefObject<LinkHandlers>,
  { text, rules, onPerson, onFind }: { text: ArticleText; rules: AutoRule[]; onPerson: (person: Person | null) => void; onFind: () => void },
) {
  const workspace = useWorkspace()
  useEffect(() => {
    handlers.current = {
      onOpen: (link) => {
        if (link.kind === 'url' || link.kind === 'project-url') openInNewTab(link.url)
        else if (link.kind === 'object') workspace.open({ type: link.type, id: link.id })
        else if (link.kind === 'person') onPerson(personById(link.personId))
        else if (link.kind === 'jump') {
          const target = resolveJump(text.doc(), link.to)
          if (target) text.goTo(target.kind === 'heading' ? target.from + 1 : target.from, target.kind === 'heading' ? target.end - 1 : target.end)
        }
      },
      onFind,
      rules: () => rules,
    }
  })
}
