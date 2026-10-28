// People, until the server has them (docs/plans/31): a fixed list of made-up people, and whom you follow, kept on this device.
// Shaped like the API they will come from: when it exists only this file changes (usePeople / personById / the follow store).
import { useEffect, useState, useSyncExternalStore } from 'react'
import { fold } from '../search/search'

export type Person = {
  id: string
  name: string
  handle: string
  bio: string
  /** How many follow them (made up) */
  followers: number
  /** Their projects, by name and address */
  projects: { title: string; url: string }[]
}

const project = (handle: string, title: string, n: number) => ({ title, url: `https://example.com/u/${handle}/project/${n}` })

export const PEOPLE: Person[] = [
  { id: 'u1', name: 'Eleni Markou', handle: 'eleni', bio: 'Draws old harbour towns and the roads between them.', followers: 214, projects: [project('eleni', 'The Aegean ports', 1)] },
  { id: 'u2', name: 'Nikos Pappas', handle: 'nikos', bio: 'Writes the history of every village he walks through.', followers: 98, projects: [project('nikos', 'Mountain villages', 2), project('nikos', 'Old roads', 3)] },
  { id: 'u3', name: 'Sofia Andreou', handle: 'sofia', bio: 'Fantasy worlds, one river at a time.', followers: 1320, projects: [project('sofia', 'The Drowned Kingdom', 4)] },
  { id: 'u4', name: 'Yannis Kostas', handle: 'yannis', bio: 'Battles, borders and the treaties that moved them.', followers: 57, projects: [project('yannis', '1821', 5)] },
  { id: 'u5', name: 'Maria Dimou', handle: 'maria', bio: 'Botanist. Maps where the wild herbs grow.', followers: 410, projects: [project('maria', 'Herbs of Crete', 6)] },
  { id: 'u6', name: 'Alex Rivers', handle: 'alexr', bio: 'Game master. Campaign maps and their lore.', followers: 762, projects: [project('alexr', 'Shattered Coast', 7), project('alexr', 'The Ash Road', 8)] },
  { id: 'u7', name: 'Katerina Lazou', handle: 'katerina', bio: 'Teaches geography with hand-drawn maps.', followers: 133, projects: [project('katerina', 'Rivers of Europe', 9)] },
  { id: 'u8', name: 'Dimitris Vlahos', handle: 'dvlahos', bio: 'Islands, lighthouses and the stories of their keepers.', followers: 289, projects: [project('dvlahos', 'Lighthouses', 10)] },
  { id: 'u9', name: 'Ioanna Petrou', handle: 'ioanna', bio: 'Archaeologist. Digs, layers and timelines.', followers: 341, projects: [project('ioanna', 'Ancient Messene', 11)] },
  { id: 'u10', name: 'Sam Holt', handle: 'samholt', bio: 'Trails and peaks; every hike gets a map.', followers: 76, projects: [project('samholt', 'Pindus trails', 12)] },
  { id: 'u11', name: 'Christina Nikolaou', handle: 'christina', bio: 'Family trees and the towns they came from.', followers: 45, projects: [project('christina', 'Where we came from', 13)] },
  { id: 'u12', name: 'Leo Marin', handle: 'leomarin', bio: 'Sci-fi star charts and space stations.', followers: 980, projects: [project('leomarin', 'Outer Rim', 14)] },
]

export const personById = (id: string) => PEOPLE.find((p) => p.id === id) ?? null

/** Their initials, for the round picture */
export const initialsOf = (person: Person) =>
  person.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/** The people whose name or handle has every word of the query. Slow on purpose, a little, like the API it stands for */
export function usePeople(query: string): { people: Person[]; loading: boolean } {
  const [result, setResult] = useState<{ query: string; people: Person[] } | null>(null)
  useEffect(() => {
    const words = fold(query).split(/\s+/).filter(Boolean)
    const timer = window.setTimeout(() => {
      setResult({ query, people: PEOPLE.filter((p) => words.every((w) => fold(`${p.name} ${p.handle}`).includes(w))) })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [query])
  return { people: result?.people ?? [], loading: result?.query !== query }
}

// Whom you follow: on this device for now
const FOLLOWING_KEY = 'map:following'
const listeners = new Set<() => void>()
let following: string[] = read()

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FOLLOWING_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function write(next: string[]) {
  following = next
  try {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(next))
  } catch {
    // Not kept: it is forgotten on reload
  }
  listeners.forEach((listener) => listener())
}

export const isFollowing = (id: string) => following.includes(id)
export const setFollowing = (id: string, follow: boolean) => {
  if (follow !== isFollowing(id)) write(follow ? [...following, id] : following.filter((f) => f !== id))
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether you follow this person, and the switch */
export function useFollowing(id: string): [boolean, (follow: boolean) => void] {
  const followed = useSyncExternalStore(subscribe, () => following.includes(id))
  return [followed, (follow) => setFollowing(id, follow)]
}
