import { describe, expect, test, vi } from 'vitest'

import {
  CookieAuthError,
  createCookieAuthFetcher
} from '../../apps/companion-service/src/feed/cookieAuthFetcher'

describe('createCookieAuthFetcher', () => {
  test('attaches stored cookies to the request Cookie header', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('auth_token=abc; ct0=xyz'),
      save: vi.fn()
    }
    const extractCookies = vi.fn()
    const baseFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'x',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    await authFetch('https://x.com/i/api/graphql/test')

    expect(cookiesRepo.get).toHaveBeenCalledWith('x')
    expect(baseFetch).toHaveBeenCalledWith('https://x.com/i/api/graphql/test', {
      headers: { Cookie: 'auth_token=abc; ct0=xyz' }
    })
  })

  test('extracts cookies when none are stored', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue(null),
      save: vi.fn()
    }
    const extractCookies = vi.fn().mockResolvedValue('fresh=abc123')
    const baseFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'youtube',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    await authFetch('https://www.youtube.com/youtubei/v1/browse')

    expect(extractCookies).toHaveBeenCalledTimes(1)
    expect(cookiesRepo.save).toHaveBeenCalledWith('youtube', 'fresh=abc123')
    expect(baseFetch).toHaveBeenCalledWith('https://www.youtube.com/youtubei/v1/browse', {
      headers: { Cookie: 'fresh=abc123' }
    })
  })

  test('retries with fresh cookies on 401', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('expired=old'),
      save: vi.fn()
    }
    const extractCookies = vi.fn().mockResolvedValue('new=fresh')
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'x',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    const response = await authFetch('https://x.com/i/api/graphql/test')

    expect(response.status).toBe(200)
    expect(extractCookies).toHaveBeenCalledTimes(1)
    expect(cookiesRepo.save).toHaveBeenCalledWith('x', 'new=fresh')
    expect(baseFetch).toHaveBeenCalledTimes(2)
    expect(baseFetch).toHaveBeenNthCalledWith(1, 'https://x.com/i/api/graphql/test', {
      headers: { Cookie: 'expired=old' }
    })
    expect(baseFetch).toHaveBeenNthCalledWith(2, 'https://x.com/i/api/graphql/test', {
      headers: { Cookie: 'new=fresh' }
    })
  })

  test('throws CookieAuthError when retry also returns 401', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('bad=cookie'),
      save: vi.fn()
    }
    const extractCookies = vi.fn().mockResolvedValue('still=bad')
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('unauthorized again', { status: 401 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'youtube',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    let caught: CookieAuthError | null = null

    try {
      await authFetch('https://www.youtube.com/youtubei/v1/browse')
    } catch (error) {
      caught = error as CookieAuthError
    }

    expect(caught).toBeInstanceOf(CookieAuthError)
    expect(caught!.platform).toBe('youtube')
    expect(caught!.statusCode).toBe(401)
  })

  test('does not retry on non-401 errors', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('valid=cookie'),
      save: vi.fn()
    }
    const extractCookies = vi.fn()
    const baseFetch = vi.fn().mockResolvedValue(new Response('server error', { status: 500 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'x',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    const response = await authFetch('https://x.com/i/api/graphql/test')

    expect(response.status).toBe(500)
    expect(extractCookies).not.toHaveBeenCalled()
    expect(baseFetch).toHaveBeenCalledTimes(1)
  })

  test('merges Cookie header when request already has other headers', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('a=1'),
      save: vi.fn()
    }
    const extractCookies = vi.fn()
    const baseFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'x',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    await authFetch('https://x.com/i/api/graphql/test', {
      headers: {
        'Content-Type': 'application/json',
        'X-Twitter-Active-User': 'yes'
      }
    })

    expect(baseFetch).toHaveBeenCalledWith('https://x.com/i/api/graphql/test', {
      headers: {
        'Content-Type': 'application/json',
        'X-Twitter-Active-User': 'yes',
        Cookie: 'a=1'
      }
    })
  })

  test('passes through successful 200 responses unchanged', async () => {
    const cookiesRepo = {
      get: vi.fn().mockReturnValue('token=ok'),
      save: vi.fn()
    }
    const extractCookies = vi.fn()
    const expectedBody = JSON.stringify({ data: 'test' })
    const baseFetch = vi.fn().mockResolvedValue(new Response(expectedBody, { status: 200 }))

    const authFetch = createCookieAuthFetcher({
      platform: 'youtube',
      cookiesRepo,
      extractCookies,
      baseFetch: baseFetch as typeof fetch
    })

    const response = await authFetch('https://example.com/api')
    const body = await response.text()

    expect(body).toBe(expectedBody)
    expect(extractCookies).not.toHaveBeenCalled()
  })
})