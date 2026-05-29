// eslint-disable-next-line no-unused-vars
export type AuthFetchFunction = (_url: string, _init?: RequestInit) => Promise<Response>

export class CookieAuthError extends Error {
  platform: string
  statusCode: number

  constructor(platform: string, statusCode: number) {
    super(`Cookie authentication failed for ${platform} (HTTP ${statusCode})`)
    this.name = 'CookieAuthError'
    this.platform = platform
    this.statusCode = statusCode
  }
}

type CreateCookieAuthFetcherDependencies = {
  platform: string
  cookiesRepo: {
    // eslint-disable-next-line no-unused-vars
    get: (platform: string) => string | null
    // eslint-disable-next-line no-unused-vars
    save: (platform: string, cookieString: string) => void
  }
  extractCookies: () => Promise<string>
  baseFetch?: typeof fetch
  csrfCookieName?: string
}

export const createCookieAuthFetcher = ({
  platform,
  cookiesRepo,
  extractCookies,
  baseFetch = fetch,
  csrfCookieName
}: CreateCookieAuthFetcherDependencies): AuthFetchFunction => {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const cookieString = await getOrExtractCookies()

    const requestInit = mergeCookieHeader(init, cookieString, csrfCookieName)
    const response = await baseFetch(url, requestInit)

    if (response.status !== 401 && response.status !== 403) {
      return response
    }

    const newCookieString = await extractCookies()
    cookiesRepo.save(platform, newCookieString)

    if (newCookieString === cookieString) {
      throw new CookieAuthError(platform, response.status)
    }

    const retryResponse = await baseFetch(url, mergeCookieHeader(init, newCookieString, csrfCookieName))

    if (retryResponse.status === 401 || retryResponse.status === 403) {
      throw new CookieAuthError(platform, retryResponse.status)
    }

    return retryResponse
  }

  async function getOrExtractCookies(): Promise<string> {
    const stored = cookiesRepo.get(platform)

    if (stored !== null) {
      return stored
    }

    const fresh = await extractCookies()
    cookiesRepo.save(platform, fresh)

    return fresh
  }
}

const extractCsrfToken = (cookieString: string, cookieName: string): string | null => {
  const pattern = new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`)
  const match = cookieString.match(pattern)
  return match?.[1] ?? null
}

const mergeCookieHeader = (
  init: RequestInit | undefined,
  cookieString: string,
  csrfCookieName?: string
): RequestInit => {
  const existingHeaders: Record<string, string> = {}

  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        existingHeaders[key] = value
      })
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        existingHeaders[key] = value
      }
    } else {
      Object.assign(existingHeaders, init.headers)
    }
  }

  const headers: Record<string, string> = { ...existingHeaders, Cookie: cookieString }

  if (csrfCookieName) {
    const csrfToken = extractCsrfToken(cookieString, csrfCookieName)
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken
    }
  }

  return {
    ...init,
    headers
  }
}