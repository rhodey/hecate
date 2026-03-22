import { PassThrough } from 'stream'
import { spawn } from 'child_process'

export class Mic {
  constructor(rate=48000) {
    this.rate = rate
    this.stream = new PassThrough()
    this.logs = ``
  }

  start() {
    const stdio = ['pipe', 'pipe', 'pipe']
    const input = `-f pulse -sample_rate 48000 -channels 1 -fragment_size 960 -i signal_out.monitor`
    const output = `-map 0:a:0 -vn -sn -dn -ac 1 -ar ${this.rate} -c:a pcm_s16le -f s16le pipe:1`
    const args = `-hide_banner -loglevel error ${input} ${output}`.split(` `)
    const env = { PULSE_SERVER: `unix:/tmp/pulse/native` }
    const child = spawn('ffmpeg', args, { stdio, env })
    if (!child.pid) { throw new Error('ffmpeg: no pid') }
    this.child = child
    this.child.stderr.setEncoding('utf8')
    this.child.stderr.on('data', (log) => this.logs += log)
    this.child.stdout.on('data', (data) => this._data(data))
    child.once('exit', (code) => {
      this.stream.emit('error', new Error(`ffmpeg: exit ${code} ${this.logs}`))
      this.stop()
    })
  }

  _data(data) {
    if (!this.child) { return }
    this.stream.write(data)
  }

  stop() {
    if (!this.child) { return }
    const child = this.child
    this.child = null
    child.removeAllListeners()
    try {
      this.stream.end()
    } catch (err) { }
    const kill = () => {
      this.stream.removeAllListeners()
      child.kill('SIGKILL')
    }
    child.kill('SIGTERM')
    setTimeout(kill, 1000)
  }
}
