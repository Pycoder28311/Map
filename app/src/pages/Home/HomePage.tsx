import DownloadIcon from '../../components/icons/DownloadIcon'
import Button from '../../components/ui/Button'
import ButtonLink from '../../components/ui/ButtonLink'
import SeeMoreLink from '../../components/ui/SeeMoreLink'
import { useApp } from '../../context/AppContext'

export default function HomePage() {
  const { count, increment } = useApp()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <p className="text-body">Test</p>

      <ButtonLink
        variant="ghost"
        icon={DownloadIcon}
        iconAnimation="download"
        href="https://github.com/Pycoder28311/Map/releases/download/test01/app-0.1.0-1.x86_64.rpm"
        className="self-start"
      >
        Download Map for Fedora
      </ButtonLink>

      <div className="flex gap-2">
        <ButtonLink to="/sign-in">Sign in</ButtonLink>
        <ButtonLink to="/sign-up" variant="secondary">
          Sign up
        </ButtonLink>
      </div>

      <Button variant="secondary" onClick={increment} className="self-start">
        Clicked {count} times
      </Button>

      <SeeMoreLink to="/dashboard">Go to dashboard</SeeMoreLink>
    </main>
  )
}
