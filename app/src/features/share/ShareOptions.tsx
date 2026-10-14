import { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { FaLinkedinIn } from 'react-icons/fa'
import { LuCheck, LuCopy, LuMail, LuShare2 } from 'react-icons/lu'
import { SiFacebook, SiWhatsapp, SiX } from 'react-icons/si'
import Button from '../../components/ui/buttons/Button'
import { findObject } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { usePanelRegistry } from '../workspace/registryContext'
import { shareUrl, socialLinks, type SocialSite } from './shareLinks'

const SITES: { site: SocialSite; label: string; icon: IconType }[] = [
  { site: 'x', label: 'X', icon: SiX },
  { site: 'facebook', label: 'Facebook', icon: SiFacebook },
  { site: 'linkedin', label: 'LinkedIn', icon: FaLinkedinIn },
  { site: 'whatsapp', label: 'WhatsApp', icon: SiWhatsapp },
  { site: 'email', label: 'Email', icon: LuMail },
]

// Full class strings so Tailwind can detect them at build time.
const SOCIAL =
  'inline-flex size-9 items-center justify-center rounded-full bg-fill text-fg-muted transition-colors hover:bg-fill-strong hover:text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** The ways to share one object's link: copy, the device's share sheet, social sites and email. `onChoose` adds "Choose another" */
export default function ShareOptions({ id, onChoose }: { id: string; onChoose?: () => void }) {
  useMockObjects() // the name follows renames
  const registry = usePanelRegistry()
  const object = findObject(id)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!object) return <p className="p-2 text-body text-fg-muted">This object is gone.</p>
  const url = shareUrl({ type: object.kind, id: object.id }, registry, window.location.origin)
  const links = socialLinks(url, object.name)
  const Icon = KIND_ICON[object.kind]

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
          <p className="truncate text-body font-medium">{object.name}</p>
          <p className="truncate text-small text-fg-subtle">{url}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" icon={copied ? LuCheck : LuCopy} onClick={copy} className="flex-1">
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        {'share' in navigator && (
          <Button variant="secondary" icon={LuShare2} onClick={() => navigator.share({ title: object.name, url }).catch(() => {})}>
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
        <button type="button" onClick={onChoose} className="cursor-pointer self-start text-small text-fg-muted hover:text-fg">
          Choose another
        </button>
      )}
    </div>
  )
}
