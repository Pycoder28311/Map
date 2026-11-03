// The Autolinker panel's small parts: the draft's slide, a phrase's tag, Link's address column, a section of the form, a row's endpoint.
import type { Node as PMNode } from '@tiptap/pm/model'
import { useEffect, useState, type ReactNode } from 'react'
import { LuCheck, LuSearch, LuX } from 'react-icons/lu'
import Button from '../../../../components/ui/buttons/Button'
import IconButton from '../../../../components/ui/buttons/IconButton'
import LinkButton from '../../../../components/ui/buttons/LinkButton'
import type { PlainIcon } from '../../../../components/ui/icons/IconSlot'
import { openInNewTab, withScheme } from '../../../../lib/urls'
import { useWorkspace } from '../../../workspace/useWorkspace'
import { isWebUrl, LIMITS, type ArticleLink } from '../linkHref'
import { useLinkInfo } from '../LinkPreview'

/** A draft opening: its height grows from nothing (the rows below move down with it) instead of appearing at once */
export function Slide({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // Two frames: the closed size must be painted first, or there is nothing to slide from
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setOpen(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

/** The modal's two inputs, plain: a thin line round them, nothing else */
const SIMPLE_INPUT = 'w-full border border-line bg-surface px-2 py-1 text-body outline-none focus:border-accent'

/** A phrase as a tag (the autolinkers' rows, and the input while the phrases are written); `onRemove`: its X, in front of the text, shows while it is hovered */
export function Tag({ phrase, onRemove }: { phrase: string; onRemove?: () => void }) {
  return (
    <span className="group/tag relative inline-flex max-w-44 shrink-0 items-center rounded-[4px] bg-fill-strong px-1.5 py-0.5 text-body leading-snug">
      <span className="truncate">{phrase}</span>
      {onRemove && (
        // At the tag's right end, in front of the text (the tag does not grow); shown while it is hovered. A button has no shape of its own
        // (styles/buttons.css): its box is clipped to the tag's corners
        <span className="absolute inset-y-0 end-0 inline-flex items-center overflow-hidden rounded-[4px] bg-fill-strong opacity-0 transition-opacity group-focus-within/tag:opacity-100 group-hover/tag:opacity-100">
          <IconButton icon={LuX} label={`Remove: ${phrase}`} size="sm" className="size-5 min-h-0 min-w-0 [--btn-icon-size:0.625rem]!" onClick={onRemove} />
        </span>
      )}
    </span>
  )
}

/** Link's section: an address to choose */
export function UrlColumn({ chosen, onPick }: { chosen: ArticleLink | null; onPick: (link: ArticleLink) => void }) {
  const [url, setUrl] = useState(chosen?.kind === 'url' ? chosen.url : '')
  const full = withScheme(url)
  const valid = url.trim() !== '' && isWebUrl(full)
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onPick({ kind: 'url', url: full })
      }}
    >
      <input aria-label="Link" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={LIMITS.url} className={SIMPLE_INPUT} />
      <Button type="submit" variant="text" size="sm" icon={LuCheck} aria-pressed={chosen?.kind === 'url' && chosen.url === full} disabled={!valid} className="self-start">
        Use this link
      </Button>
    </form>
  )
}

/** A section: its name with its icon and, at the right of the name, a search button (it opens the search field below it and becomes an X that closes it), then its picker */
export function SectionBody({ title, icon: Icon, searchable, children }: { title: string; icon: PlainIcon; searchable: boolean; children: (searchOpen: boolean) => ReactNode }) {
  const [searching, setSearching] = useState(false)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-medium text-fg-muted">
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{title}</span>
        </h3>
        {searchable && (
          <IconButton icon={searching ? LuX : LuSearch} label={searching ? `Close the search of ${title}` : `Search in ${title}`} size="sm" aria-expanded={searching} onClick={() => setSearching(!searching)} />
        )}
      </div>
      {/* (closing it starts the picker again, so its search is empty the next time) */}
      <div key={String(searching)} className="flex min-w-0 flex-1 flex-col gap-2">
        {children(searching)}
      </div>
    </div>
  )
}

/**
 * "Link: <where it goes>" of a list row. The endpoint is clickable (an address opens in a new tab, an object opens beside the article) except
 * for a Jump link and Follow, which are only named
 */
export function Endpoint({ link, doc, onLeave }: { link: ArticleLink; doc: PMNode; onLeave: () => void }) {
  const workspace = useWorkspace()
  const info = useLinkInfo(link, doc)
  const text = link.kind === 'url' || link.kind === 'project-url' ? link.url : info.title
  const open =
    link.kind === 'url'
      ? () => openInNewTab(link.url)
      : link.kind === 'object'
        ? () => {
            onLeave()
            workspace.open({ type: link.type, id: link.id })
          }
        : null
  return (
    <span className="flex max-w-[45%] min-w-0 shrink-0 items-center gap-1 text-small">
      <span className="shrink-0 text-fg-subtle">Link:</span>
      {open ? (
        <LinkButton onClick={open} className="min-w-0 truncate" title={text}>
          {text}
        </LinkButton>
      ) : (
        <span className="min-w-0 truncate text-fg-muted" title={text}>
          {text}
        </span>
      )}
    </span>
  )
}

