import { describe, expect, test } from 'vitest'

import { createInMemoryDatabase } from '../../apps/companion-service/src/db/client'
import { createCookiesRepository } from '../../apps/companion-service/src/db/cookiesRepository'

describe('cookiesRepository', () => {
  test('get returns null when no cookies are stored', () => {
    const database = createInMemoryDatabase()
    const repo = createCookiesRepository(database)

    expect(repo.get('x')).toBeNull()
    expect(repo.get('youtube')).toBeNull()
  })

  test('save stores a cookie string and get retrieves it', () => {
    const database = createInMemoryDatabase()
    const repo = createCookiesRepository(database)

    repo.save('x', 'auth_token=abc123; ct0=xyz789')

    expect(repo.get('x')).toBe('auth_token=abc123; ct0=xyz789')
  })

  test('save with the same platform overwrites the previous value', () => {
    const database = createInMemoryDatabase()
    const repo = createCookiesRepository(database)

    repo.save('youtube', 'SAPISID=old')
    repo.save('youtube', 'SAPISID=new; HSID=secret')

    expect(repo.get('youtube')).toBe('SAPISID=new; HSID=secret')
  })

  test('extracted_at is updated on each save', () => {
    const database = createInMemoryDatabase()
    const repo = createCookiesRepository(database)

    repo.save('x', 'a1=1')

    const row = database
      .prepare('SELECT extracted_at FROM cookies WHERE platform = ?')
      .get('x') as { extracted_at: string }

    expect(row.extracted_at).toBeTruthy()
    expect(new Date(row.extracted_at).getTime()).toBeGreaterThan(0)
  })

  test('stores cookies for multiple platforms independently', () => {
    const database = createInMemoryDatabase()
    const repo = createCookiesRepository(database)

    repo.save('x', 'x-cookie')
    repo.save('youtube', 'yt-cookie')

    expect(repo.get('x')).toBe('x-cookie')
    expect(repo.get('youtube')).toBe('yt-cookie')
  })
})