import fs from 'fs'
import { chromium } from 'playwright'

function onError(err) {
  console.log('error', err)
  process.exit(1)
}

const sleep = (ms) => new Promise((res, rej) => setTimeout(res, ms))

async function getCode(page) {
  const button = page.getByText('Refresh code').first()
  if (await button.isVisible().catch(() => false)) {
    await button.click()
    console.log('!! refresh')
  }

  let svg = page.locator('svg').first()
  await svg.waitFor({ timeout: 3_000, state: 'visible' })
  svg = await svg.evaluate((el) => el.outerHTML)
  fs.writeFileSync('./desktop/qrcode.svg', svg, 'utf8')
  console.log('!! have svg')
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
  const context = browser.contexts()[0]
  if (!context) { throw new Error('No browser context') }

  const pages = context.pages()
  const page = pages[0]
  if (!page) { throw new Error('No pages') }
  await page.waitForLoadState('domcontentloaded')

  while (true) {
    try {
      await getCode(page)
      await sleep(1_000)
    } catch (err) {
      await sleep(1_000)
    }
  }

  await browser.close()
}

main().catch(onError)
