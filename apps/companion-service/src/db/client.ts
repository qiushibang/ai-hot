import Database from 'better-sqlite3'

export type SqliteDatabase = Database.Database

export const createFileDatabase = (databasePath: string): SqliteDatabase => new Database(databasePath)

export const createInMemoryDatabase = (): SqliteDatabase => new Database(':memory:')
