import { chromium } from 'playwright-core'
import { readFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

async function main() {
  const chromeDir = join(os.homedir(), 'Library/Application Support/Google/Chrome')
  const activePort = readFileSync(join(chromeDir, 'DevToolsActivePort'), 'utf8').trim()
  const [port, wsPath] = activePort.split('\n')

  const wsUrl = `ws://127.0.0.1:${port}${wsPath}`
  console.log(`Connecting via WebSocket: ${wsUrl}`)

  const browser = await chromium.connectOverCDP(wsUrl, { noDefaults: true })
  const context = browser.contexts()[0]!
  const page = await context.newPage()

  // Intercept network responses matching SearchTimeline
  const capturedResponses: { url: string; body: string }[] = []
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('SearchTimeline')) {
      console.log(`\n[INTERCEPTED] ${url.slice(0, 150)}`)
      try {
        const body = await response.text()
        capturedResponses.push({ url, body })
        console.log(`  Status: ${response.status()}, Body length: ${body.length}`)
        console.log(`  Body preview: ${body.slice(0, 400)}`)
      } catch (e) {
        console.log(`  Error reading body: ${e}`)
      }
    }
  })

  // Navigate to X search page directly with the query
  const searchUrl = 'https://x.com/search?q=AI&src=typed_query&f=live'
  console.log(`\nNavigating to: ${searchUrl}`)
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })

  // Wait for API responses to come in
  console.log('\nWaiting for SearchTimeline API responses...')
  await page.waitForTimeout(5000)

  console.log(`\nCaptured ${capturedResponses.length} SearchTimeline responses`)

  if (capturedResponses.length > 0) {
    const parsed = JSON.parse(capturedResponses[0].body)
    const instructions = parsed?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? []
    console.log(`Instructions: ${instructions.length}`)
    if (instructions.length > 0) {
      console.log('First instruction:', JSON.stringify(instructions[0]).slice(0, 300))
    }
  }

  await page.close()
  await browser.close()
  console.log('\nDone')
}

main().catch(console.error)