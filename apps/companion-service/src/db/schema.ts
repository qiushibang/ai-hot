export const FEED_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS feed_items (
    id TEXT NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    url TEXT NOT NULL,
    author TEXT NOT NULL,
    published_at TEXT NOT NULL,
    popularity_score REAL NOT NULL,
    growth_score REAL NOT NULL,
    raw_tags TEXT NOT NULL,
    source_id TEXT NOT NULL,
    collected_date TEXT NOT NULL,
    PRIMARY KEY (id, collected_date)
  )
`

export const PLATFORM_STATUS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS platform_statuses (
    platform TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    detail TEXT,
    last_updated_at TEXT,
    last_collected_at TEXT
  )
`

export const COOKIES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS cookies (
    platform TEXT PRIMARY KEY,
    cookie_string TEXT NOT NULL,
    extracted_at TEXT NOT NULL
  )
`
