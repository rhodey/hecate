import { request } from 'undici'
import { chromium } from 'playwright'

let conn = null

async function connect() {
  if (conn) { return conn }
  const { body } = await request('http://desktop:9222/json/version', { headers: { host: 'localhost:9223' }})
  const { webSocketDebuggerUrl } = await body.json()
  const wsUrl = webSocketDebuggerUrl
    .replace('ws://localhost:', 'ws://desktop:')
    .replace('ws://127.0.0.1:', 'ws://desktop:')
    .replace('9223', '9222')
  const browser = await chromium.connectOverCDP(wsUrl)
  const context = browser.contexts()[0]
  if (!context) { throw new Error('No browser context') }
  const pages = context.pages()
  const page = pages[0]
  if (!page) { throw new Error('No pages') }
  await page.waitForLoadState('domcontentloaded')
  return conn = context
}

const sleep = (ms) => new Promise((res, rej) => setTimeout(res, ms))

export async function startPhone() {
  await connect()
}

export async function waitForCall() {
  const context = await connect()
  const main = context.pages()[0]

  while (true) {
    const incomingCall = main.locator('div.IncomingCallBar__conversation--message-text')
    const isIncomingCall = await incomingCall.isVisible().catch(() => false)

    if (!isIncomingCall) {
      await sleep(1_000)
      continue
    }

    const text = await incomingCall.textContent()
    const isVoice = text.includes('voice')

    const answer = main.getByRole('button', { name: 'Answer call', exact: true })
    await answer.waitFor({ timeout: 1_000, state: 'visible' })
    await answer.click()

    await sleep(1_000)
    const popup = context.pages()[1]
    if (!popup) {
      return isVoice ? 'voice' : 'video'
    }

    const allow = popup.getByText('Allow Access').first()
    const isAllow = await allow.isVisible().catch(() => false)
    if (isAllow) { await allow.click() }
    return isVoice ? 'voice' : 'video'
  }
}

export async function waitForCallEnd() {
  await sleep(2_000)
  const context = await connect()
  const main = context.pages()[0]

  while (true) {
    const end = main.locator(`button:text("End")`)
    const isEndVisible = await end.isVisible().catch(() => false)

    if (isEndVisible) {
      await sleep(1_000)
      continue
    }

    return
  }
}
