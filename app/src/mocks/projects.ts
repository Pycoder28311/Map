// MOCK DATA: fake projects and maps in the shape the backend will return them.
// Replaced by API calls later; components only use the types and the find helpers.

export type MockMap = { id: string; name: string }
export type MockProject = { id: string; name: string; description: string; maps: MockMap[] }

export const PROJECTS: MockProject[] = [
  {
    id: 'p1',
    name: 'City parks',
    description: 'Green spaces and playgrounds across the city.',
    maps: [
      { id: 'm1', name: 'Parks overview' },
      { id: 'm2', name: 'Playgrounds' },
    ],
  },
  {
    id: 'p2',
    name: 'Hiking trails',
    description: 'Mountain routes with difficulty and length.',
    maps: [
      { id: 'm3', name: 'North routes' },
      { id: 'm4', name: 'South routes' },
    ],
  },
  {
    id: 'p3',
    name: 'Office locations',
    description: 'Where the team works.',
    maps: [{ id: 'm5', name: 'Offices' }],
  },
]

export const findProject = (id?: string) => PROJECTS.find((p) => p.id === id)

export const findMap = (id?: string) => {
  for (const project of PROJECTS) {
    const map = project.maps.find((m) => m.id === id)
    if (map) return { ...map, project }
  }
  return undefined
}
