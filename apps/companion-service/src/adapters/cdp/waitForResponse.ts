import type { Page } from 'playwright-core'

const RESPONSE_TIMEOUT_MS = 20_000

export const waitForResponse = async (
  page: Page,
  urlPattern: RegExp,
  timeoutMs = RESPONSE_TIMEOUT_MS
): Promise<unknown> =>
  new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => {
      page.off('response', handler)
      reject(new Error(`network response timeout after ${timeoutMs}ms: ${urlPattern.source}`))
    }, timeoutMs)

    const handler = (response: { url: () => string; json: () => Promise<unknown> }) => {
      if (!urlPattern.test(response.url())) return

      clearTimeout(timer)
      page.off('response', handler)

      response
        .json()
        .then(resolve)
        .catch((error: unknown) => reject(error))
    }

    page.on('response', handler)
  })