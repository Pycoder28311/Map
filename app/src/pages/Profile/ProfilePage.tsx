import { useState, type ReactNode } from 'react'
import { LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import Card from '../../components/ui/Card'
import ErrorText from '../../components/ui/fields/ErrorText'
import AvatarEditor from '../../features/profile/AvatarEditor'
import NameForm from '../../features/profile/NameForm'
import PasswordForm from '../../features/profile/PasswordForm'
import ProfileBanner from '../../features/profile/ProfileBanner'
import { authClient } from '../../lib/auth-client'
import { DAY_MONTH_YEAR } from '../../lib/dates'

// No <main> here: AppLayout provides it
/**
 * The signed-in user's page (/profile, from the navbar's profile picture): a dark fantasy banner, the
 * picture (camera button: change it) and name over its bottom edge, then two cards: the name, and the password; Sign out (red) at the bottom.
 */
export default function ProfilePage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const user = session?.user
  if (!user) return null

  const signOut = async () => {
    setSigningOut(true)
    await authClient.signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="relative min-h-full pb-24">
      {/* The banner, the whole width of the page, fading into it at the bottom */}
      <div className="relative h-52 overflow-hidden sm:h-64 lg:h-72">
        <ProfileBanner />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-surface-muted"
        />
      </div>

      <div className="relative mx-auto flex max-w-[56rem] flex-col gap-8 px-4 sm:px-6">
        {/* The picture over the banner's edge, the name beside it */}
        <header className="-mt-14 flex flex-col items-start gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
          <AvatarEditor name={user.name} image={user.image} onError={setAvatarError} />
          <div className="flex min-w-0 flex-col gap-1 sm:pb-2">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{user.name}</h1>
            <p className="truncate text-body text-fg-muted">
              {user.email}
              {user.createdAt && <span className="text-fg-subtle"> · Joined {DAY_MONTH_YEAR.format(new Date(user.createdAt))}</span>}
            </p>
          </div>
        </header>
        <ErrorText>{avatarError}</ErrorText>

        <div className="grid items-start gap-6 md:grid-cols-2">
          <Section title="Profile" description="The name other people see on what you share.">
            <NameForm name={user.name} />
          </Section>
          <Section title="Password" description="Used to sign in with your email.">
            <PasswordForm email={user.email} />
          </Section>
        </div>

        {/* Sign out, in red, at the end of the page */}
        <footer className="flex items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-body text-fg-muted">Signed in as {user.email}</p>
          <Button danger icon={LuLogOut} onClick={signOut} disabled={signingOut}>
            {signingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </footer>
      </div>
    </div>
  )
}

/** One card of settings: a title, a line under it, then its form */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card variant="white" className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1 border-b border-line pb-4">
        <h2 className="text-heading font-semibold">{title}</h2>
        <p className="text-small text-fg-muted">{description}</p>
      </div>
      {children}
    </Card>
  )
}
