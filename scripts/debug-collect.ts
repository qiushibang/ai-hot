import { collectTodayFeed } from '../apps/companion-service/src/feed/collectTodayFeed'

async function main() {
  const session = {
    getCookies: async () => 'cookie=valid',
    close: async () => {}
  }
  const cookiesRepo = {
    get: () => 'cookie=valid',
    save: () => {}
  }

  const xApiAdapter = async () => [{ id: 'x:1', platform: 'x', title: 'From API', url: 'https://x.com/a', sourceId: '1' }] as any
  let apiCalled = false
  const wrappedApi = async (...args: any[]) => { apiCalled = true; console.log('API adapter called!'); return xApiAdapter(...args) }
  let htmlCalled = false
  const xHtmlAdapter = async () => { htmlCalled = true; console.log('HTML adapter called!'); return [] as any }

  const result = await collectTodayFeed({
    githubAdapter: async () => [] as any,
    huggingFaceAdapter: async () => [] as any,
    resolveChromeProfile: async () => ({
      isAvailable: true,
      browserExecutablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: '/Users/test/Library/Application Support/Google/Chrome',
      profileDirectory: '/Users/test/Library/Application Support/Google/Chrome/Default',
      automationUserDataDir: '/tmp',
      remoteDebuggingUrl: null,
      browserLabel: null,
      reason: null
    }),
    createBrowserSession: async () => session as any,
    detectPlatformLoginState: async () => ({ platform: 'x', state: 'ready', detail: null }) as any,
    xAdapter: xHtmlAdapter as any,
    xCdpAdapter: undefined,
    xApiAdapter: wrappedApi as any,
    youtubeApiAdapter: async () => [] as any,
    youtubeAdapter: async () => [] as any,
    cookiesRepository: cookiesRepo as any,
    now: () => '2026-01-01T00:00:00.000Z'
  })

  console.log('apiCalled:', apiCalled)
  console.log('htmlCalled:', htmlCalled)
  console.log('X status:', JSON.stringify(result.platformStatuses.find(s => s.platform === 'x')))
}

main().catch(e => console.error('Error:', e))
