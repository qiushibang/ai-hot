import { describe, expect, test, vi } from 'vitest'

import { detectPlatformLoginState } from '../../apps/companion-service/src/browser/session/detectPlatformLoginState'

describe('detectPlatformLoginState', () => {
  test('returns not_logged_in when the platform checker reports no active session', async () => {
    const session = {
      isLoggedIn: vi.fn().mockResolvedValue(false)
    }

    const state = await detectPlatformLoginState('youtube', session as never)

    expect(state).toEqual({
      platform: 'youtube',
      state: 'not_logged_in',
      detail: '当前浏览器未登录该平台',
      lastUpdatedAt: null,
      lastCollectedAt: null
    })
  })
})
