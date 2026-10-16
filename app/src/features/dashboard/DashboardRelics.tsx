import PixelSprite from '../../components/ui/pixelart/PixelSprite'
import type { SpriteName } from '../../components/ui/pixelart/sprites'

/** Size of one pixel of the items (px): each is 16 of them wide and high (the quill 20) */
const SCALE = 3

// In order along the top; each sits a little higher or lower than its neighbours
const RELICS: { name: SpriteName; drop: number }[] = [
  { name: 'sword', drop: 0 },
  { name: 'potion', drop: 28 },
  { name: 'chest', drop: 10 },
  { name: 'shield', drop: 32 },
  { name: 'egg', drop: 4 },
  { name: 'helmet', drop: 26 },
  { name: 'quill', drop: 6 },
  { name: 'campfire', drop: 30 },
  { name: 'pyxis', drop: 12 },
]

/**
 * Pixel-art items (a sword, a potion, a shield, a chest, a dragon egg, a helmet, a quill, a campfire, a pyxis) spread along the top of the Dashboard,
 * behind its content. Only a theme that turns them on shows them (--decor-display, styles/tokens.css); --decor-opacity
 * is how strongly and --decor-filter their colours (e.g. grayscale). The page the content scrolls in is a stacking context, so the -z-10 keeps them above its background.
 */
export default function DashboardRelics() {
  return (
    <div
      aria-hidden
      style={{ display: 'var(--decor-display)', opacity: 'var(--decor-opacity)', filter: 'var(--decor-filter)' }}
      className="pointer-events-none absolute inset-x-4 top-4 -z-10 flex items-start justify-between"
    >
      {RELICS.map(({ name, drop }) => (
        <div key={name} style={{ marginTop: drop }}>
          <PixelSprite name={name} scale={SCALE} />
        </div>
      ))}
    </div>
  )
}
