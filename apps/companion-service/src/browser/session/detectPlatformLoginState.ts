import type { PlatformStatus } from '@ai-hot/shared'

import type { BrowserSession } from './createBrowserSession'

export const detectPlatformLoginState = async (
  platform: 'x' | 'youtube',
  session: BrowserSession
): Promise<PlatformStatus> => {
  const isLoggedIn = await session.isLoggedIn(platform)

  return {
    platform,
    state: isLoggedIn ? 'ready' : 'not_logged_in',
    detail: isLoggedIn ? null : '当前浏览器未登录该平台',
    lastUpdatedAt: null,
    lastCollectedAt: null
  }
}
