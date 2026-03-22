import { spawn } from 'child_process'

function writeNice(child, buf) {
  const ok = child.stdin.write(buf)
  if (ok) { return Promise.resolve(1) }
  return new Promise((res, rej) => child.stdin.once('drain', res))
}

export async function speak(text, voice='azelma') {
  const form = new FormData()
  form.append('text', text)
  form.append('voice_url', voice)
  const res = await fetch(`http://${process.env.pocket}/tts`, { method: 'POST', body: form })
  const reader = res.body.getReader()
  const stdio = ['pipe', 'pipe', 'pipe']
  const input = `-fflags nobuffer -probesize 32 -analyzeduration 0 -f wav -i pipe:0`
  const output = `-f pulse -device signal_in -buffer_duration 50 -prebuf 0 pulse`
  const args = `-hide_banner -loglevel error ${input} ${output}`.split(` `)
  const env = { PULSE_SERVER: `unix:/tmp/pulse/native` }
  const child = spawn('ffmpeg', args, { stdio, env })
  return new Promise(async (res, rej) => {
    let logs = ``
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (log) => logs += log)
    child.once('exit', (code) => {
      if (code !== 0) { rej(`ffmpeg: exit ${code} ${logs}`) }
      res()
    })

    try {

      while (1) {
        const { value, done } = await reader.read()
        if (done) { break }
        await writeNice(child, Buffer.from(value))
      }

    } catch (err) {
      rej(err)
    }

    child.stdin.end()
  })
}
