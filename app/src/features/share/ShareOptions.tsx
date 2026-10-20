import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { FaLinkedinIn } from 'react-icons/fa'
import { LuCheck, LuCopy, LuMail, LuShare2 } from 'react-icons/lu'
import { SiFacebook, SiWhatsapp, SiX } from 'react-icons/si'
import Button from '../../components/ui/buttons/Button'
import { useResourceItem } from '../../lib/resource/hooks'
import { resourceByPanelType } from '../../resources/registry'
import { parsePanelKey } from '../workspace/layout'
import { usePanelRegistry } from '../workspace/registryContext'
import { shareUrl, socialLinks, type SocialSite } from './shareLinks'
import { TEXT_BUTTON } from '../../components/ui/buttons/buttonStyles'

// An empty resource for when the key names none (the hook then asks nothing)
const NONE = { name: '', api: { get: async () => ({}) } } as never

const SITES: { site: SocialSite; label: string; icon: IconType }[] = [
  { site: 'x', label: 'X', icon: SiX },
  { site: 'facebook', label: 'Facebook', icon: SiFacebook },
  { site: 'linkedin', label: 'LinkedIn', icon: FaLinkedinIn },
  { site: 'whatsapp', label: 'WhatsApp', icon: SiWhatsapp },
  { site: 'email', label: 'Email', icon: LuMail },
]

// Full class strings so Tailwind can detect them at build time.
const SOCIAL =
  'inline-flex size-9 items-center justify-center rounded-(--radius-pill) bg-fill text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/**
 * The ways to share one item's link: copy, the device's share sheet, social sites and email. `id`: its panel key (`note:5`, from
 * data-share-id). `onChoose` adds "Choose another"
 */
export default function ShareOptions({ id, onChoose }: { id: string; onChoose?: () => void }) {
  const registry = usePanelRegistry()
  const panel = parsePanelKey(id)
  const resource = resourceByPanelType(panel?.type)
  const { item, notFound } = useResourceItem(resource ?? NONE, resource ? panel?.id : undefined)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!resource || !panel?.id || notFound) return <p className="p-2 text-body text-fg-muted">This is gone.</p>
  if (!item) return <p className="p-2 text-body text-fg-subtle">Loading…</p>
  const name = resource.ui.row.title(item)
  const url = shareUrl({ type: panel.type, id: panel.id }, registry, window.location.origin)
  const links = socialLinks(url, name)
  const Icon = resource.ui.icon

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Clipboard blocked: the link stays visible to copy by hand
    }
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-(--btn-radius) bg-fill text-fg-subtle">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-body font-medium">{name}</p>
          <p className="truncate text-small text-fg-subtle">{url}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" icon={copied ? LuCheck : LuCopy} onClick={copy} className="flex-1">
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {'share' in navigator && (
          <Button variant="secondary" icon={LuShare2} onClick={() => navigator.share({ title: name, url }).catch(() => {})}>
            Share…
          </Button>
        )}
      </div>

      <div className="flex justify-between">
        {SITES.map(({ site, label, icon: SiteIcon }) => (
          <a key={site} href={links[site]} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${label}`} title={label} className={SOCIAL}>
            <SiteIcon className="size-4" />
          </a>
        ))}
      </div>

      {onChoose && (
        <button type="button" onClick={onChoose} className={`${TEXT_BUTTON} self-start`}>
          Choose another
        </button>
      )}
    </div>
  )
}
