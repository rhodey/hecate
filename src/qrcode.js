import fs from 'fs'
import { exec } from 'child_process'
import { chromium } from 'playwright'

function onError(err) {
  console.log('error', err)
  process.exit(1)
}

const sleep = (ms) => new Promise((res, rej) => setTimeout(res, ms))

const toVideoCmd = `ffmpeg -y -loop 1 -framerate 30 -t 3 -i desktop/qrcode.svg -filter_complex
    "[0:v]format=rgba,scale=1280:720:force_original_aspect_ratio=decrease[fg];
    color=c=white:s=1280x720:d=5[bg];
    [bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p" -c:v libx264 desktop/qrcode.mp4`
  .split(`\n`).map((line) => line.trim()).join(` `)

function toVideo() {
  return new Promise((res, rej) => {
    exec(toVideoCmd, (error, stdout, stderr) => {
      if (error) { rej(new Error(`ffmpeg error ${error.code} ${stderr}`)) }
      res()
    })
  })
}

let prev = ``

async function getCode(page) {
  const button = page.getByText('Refresh code').first()
  if (await button.isVisible().catch(() => false)) {
    await button.click()
    console.log('!! refresh')
  }

  let svg = page.locator('svg').first()
  await svg.waitFor({ timeout: 3_000, state: 'visible' })
  svg = await svg.evaluate((el) => el.outerHTML)
  if (prev === svg) { return console.log('!! same svg') }

  fs.writeFileSync('./desktop/qrcode.svg', svg, 'utf8')
  console.log('!! new svg')
  await toVideo()
  console.log('!! new video')
  prev = svg
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
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
      await sleep(1_000)
    }
  }
}

main().catch(onError)
