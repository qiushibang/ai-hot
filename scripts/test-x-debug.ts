import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

async function main() {
  const chromeDir = join(os.homedir(), 'Library/Application Support/Google/Chrome')
  const activePort = readFileSync(join(chromeDir, 'DevToolsActivePort'), 'utf8').trim()
  const [port, wsPath] = activePort.split('\n')

  const wsUrl = `ws://127.0.0.1:${port}${wsPath}`
  const browser = await chromium.connectOverCDP(wsUrl, { noDefaults: true })
  const context = browser.contexts()[0]!
  const page = await context.newPage()

  const captured: string[] = []
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('SearchTimeline')) {
      try {
        const body = await response.text()
        captured.push(`URL: ${url}`)
        captured.push(`Body (first 5000 chars): ${body.slice(0, 5000)}`)
        captured.push('---END---')
      } catch {}
    }
  })

  console.log('=== Navigating to X search ===')
  await page.goto(
    'https://x.com/search?q=AI&src=typed_query&f=live',
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  )
  await page.waitForTimeout(8000)

  for (const entry of captured) {
    console.log(entry)
  }

  writeFileSync('/tmp/x-response-debug.txt', captured.join('\n'))
  console.log('\nSaved to /tmp/x-response-debug.txt')

  await page.close()
  await browser.close()
}

main().catch(console.error)