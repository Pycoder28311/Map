// Only what the tests use of Node's file system (the migrations test reads backend/drizzle; the Worker types do not include Node's)
declare module 'node:fs' {
  export function readdirSync(path: string): string[]
  export function readFileSync(path: string, encoding: 'utf8'): string
}
