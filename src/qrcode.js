import fs from 'fs'
import { exec } from 'child_process'
import { request } from 'undici'
import { chromium } from 'playwright'

const sleep = (ms) => new Promise((res, rej) => setTimeout(res, ms))

function onError(err) {
  console.log('error', err)
  process.exit(1)
}

function qrCodeToJpg() {
  const cmd = `convert -background white -size 500x500 desktop/qrcode.svg desktop/qrcode.jpg`
  return new Promise((res, rej) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) { rej(new Error(`convert error ${error.code} ${stderr}`)) }
      res()
    })
  })
}

let svg = ``
let prev = ``
async function getCode(page) {
  const button = page.getByText('Refresh code').first()
  if (await button.isVisible().catch(() => false)) {
    await button.click()
    console.log('!! refresh')
  }

  const elem = page.locator('svg').first()
  await elem.waitFor({ timeout: 3_000, state: 'visible' })
  svg = await elem.evaluate((el) => el.outerHTML)
  if (prev === svg) { return console.log('!! same code') }

  console.log('!! new code')
  fs.writeFileSync('./desktop/qrcode.svg', svg, 'utf8')
  await qrCodeToJpg()
  prev = svg
}

async function main() {
  await sleep(3_000)
  // override host header
  const { body } = await request('http://desktop:9222/json/version', { headers: { host: 'localhost:9223' }})
  const { webSocketDebuggerUrl } = await body.json()

  // override host header
  const wsUrl = webSocketDebuggerUrl
    .replace('ws://localhost:', 'ws://desktop:')
    .replace('ws://127.0.0.1:', 'ws://desktop:')
    .replace('9223', '9222')

  const browser = await chromium.connectOverCDP(wsUrl)
  const context = browser.contexts()[0]
  if (!context) { throw new Error('No browser context') }

  process.on('SIGTERM', async () => {
    await browser.close()
    process.exit(0)
  })

  const pages = context.pages()
  const page = pages[0]
  if (!page) { throw new Error('No pages') }
  await page.waitForLoadState('domcontentloaded')

  while (true) {
    try {
      await getCode(page)
      await sleep(1_000)
    } catch (err) {
      console.log(err)
      await sleep(1_000)
    }
  }
}

main().catch(onError)
