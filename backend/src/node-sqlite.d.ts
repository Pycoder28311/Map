// Only what the tests use of Node's built-in SQLite (the Worker types do not include Node's)
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string)
    exec(sql: string): void
    prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[]; run(...params: unknown[]): unknown }
  }
}
