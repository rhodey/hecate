import split from 'split'
import { exec, spawn } from 'child_process'

function adbConnect() {
  return new Promise((res, rej) => {
    exec(`adb connect ${process.env.emulator}`, (err, stdout, stderr) => {
      const logs = stdout + `\n` + stderr
      if (err) { rej(new Error(`adb connect exit ${err.code} - ${logs}`)) }
      res()
    })
  })
}

function adbAwake() {
  return new Promise((res, rej) => {
    exec(`adb shell input keyevent KEYCODE_WAKEUP`, (err, stdout, stderr) => {
      const logs = stdout + `\n` + stderr
      if (err) { rej(new Error(`adb shell exit ${err.code} - ${logs}`)) }
      res()
    })
  })
}

let exit = false
const sleep = (ms) => new Promise((res, rej) => setTimeout(res, ms))

process.on('SIGTERM', async () => {
  console.log('!! cleanup')
  exit = true
  exec(`killall java`)
  // if dont sleep >= 3s then maestro.dev will fail at next loop
  await sleep(3_000)
  process.exit(0)
})

// maestro.dev is slow to exit and so need to read progress as a stream and kill early
// need 'killall java' to do the job right
async function runScript(name, testFn) {
  await adbConnect()
  const stdio = ['pipe', 'pipe', 'pipe']
  const args = `test scripts/${name}`.split(' ')
  const child = spawn('maestro', args, { stdio })
  child.stderr.setEncoding('utf8')
  child.stdout.setEncoding('utf8')

  return new Promise((res, rej) => {
    let logs = ``
    const awake = () => adbAwake().catch(rej)
    const timer = setInterval(awake, 5_000)
    child.stderr.pipe(split()).on('data', (line) => logs += (line + `\n`))
    child.stdout.pipe(split()).on('data', (line) => {
      logs += (line + `\n`)
      if (line.includes('Assertion is false')) {
        child.stderr.removeAllListeners()
        child.stdout.removeAllListeners()
        child.removeAllListeners()
        exec(`killall java`)
        clearInterval(timer)
        res('again')
      } else if (testFn(logs)) {
        child.stderr.removeAllListeners()
        child.stdout.removeAllListeners()
        child.removeAllListeners()
        exec(`killall java`)
        clearInterval(timer)
        res(logs)
      }
    })

    child.once('exit', (code) => {
      clearInterval(timer)
      if (exit) { return }
      rej(new Error(`maestro ${name} exit ${code} - ${logs}`))
    })
  })
}

export async function startPhone() {
  const testFn = (logs) => logs.includes('COMPLETED')
  const logs = await runScript('start.yml', testFn)
  if (logs === 'again') { throw new Error(`start.yml (again)`) }
}

export async function waitForCall() {
  const testFn = (logs) => {
    const lines = logs.split(`\n`)
    const markRead = lines.some((line) => line.includes(`^MARK READ$`) && line.includes('COMPLETED'))
    const isVoice = lines.some((line) => line.includes(`^ANSWER$`) && line.includes('COMPLETED'))
    const isVideo = lines.some((line) => line.includes(`^VIDEO$`) && line.includes('COMPLETED'))
    if (markRead) { return isVoice || isVideo }
    return isVoice || isVideo
  }

  while (true) {
    const logs = await runScript('answer.yml', testFn)
    if (logs === 'again') { continue }
    const lines = logs.split(`\n`)
    const isVoice = lines.some((line) => line.includes(`^ANSWER$`) && line.includes('COMPLETED'))
    const isVideo = lines.some((line) => line.includes(`^VIDEO$`) && line.includes('COMPLETED'))
    if (!isVoice && !isVideo) { throw new Error(`answer.yml !voice !video`) }
    return isVoice ? 'voice' : 'video'
  }
}

export async function waitForCallEnd() {
  const testFn = (logs) => {
    let lines = logs.split(`\n`)
    lines = lines.filter((line) => line.includes('COMPLETED'))
    return lines.length >= 4
  }
  while (true) {
    const logs = await runScript('callend.yml', testFn)
    if (logs === 'again') { continue }
    return
  }
}
