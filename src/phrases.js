import split from 'split'
import { spawn } from 'child_process'
import { Mic } from './mic.js'
import { Recorder } from './recorder.js'
import { EventEmitter } from 'events'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import ffmpeg from '@bropat/fluent-ffmpeg'
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

const truncate = (mp31, mp32) => {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(mp31, (err, metadata) => {
      if (err) { return rej(err) }
      const duration = metadata.format.duration
      const newDuration = Math.max(0, duration - 1.6)
      ffmpeg(mp31)
        .setStartTime(0)
        .setDuration(newDuration)
        .audioCodec('libmp3lame')
        .format('mp3')
        .save(mp32)
        .on('end', res)
        .on('error', rej)
        .run()
    })
  })
}

const rate_1 = 16000
const rate_2 = 48000

export class Phrases extends EventEmitter {
  constructor(tmpdir='/tmp') {
    super()
    this.tmpdir = tmpdir
    this.speaking = false
    this._mute = false
    this.early = Buffer.alloc(0)
    this.scores = []
    this.quiet = 0
  }

  start() {
    this.mic1 = new Mic(rate_1)
    this.mic1.stream.on('data', (data) => this._mic1(data))
    this.mic1.stream.on('error', (err) => this.emit('error', err))
    this.mic1.start()
    this.mic2 = new Mic(rate_2)
    this.mic2.stream.on('data', (data) => this._mic2(data))
    this.mic2.stream.on('error', (err) => this.emit('error', err))
    this.mic2.start()
    const stdio = ['pipe', 'pipe', 'pipe']
    const vad = spawn('./target/release/earshot-pipe', [], { stdio })
    if (!vad.pid) { throw new Error('earshot-pipe: no pid') }
    vad.stdout.setEncoding('utf8')
    vad.stdout.pipe(split()).on('data', (score) => this._vad(score))
    vad.once('exit', (code) => {
      this.emit('error', new Error(`earshot-pipe: exit ${code}`))
      this.stop()
    })
    this.vad = vad
  }

  mute(val=1) {
    this._mute = val
    if (!val) { return }
    this.speaking = false
    this.early = Buffer.alloc(0)
    this.scores = []
    this.quiet = 0
    if (!this.recorder) { return }
    this.recorder.stop()
    this.recorder = null
  }

  stop() {
    this.mic1.stop()
    this.mic2.stop()
    if (!this.vad) { return }
    const vad = this.vad
    this.vad = null
    vad.removeAllListeners()
    vad.kill('SIGKILL')
    if (!this.recorder) { return }
    this.recorder.stop()
    this.recorder = null
  }

  _voice() {
    this.emit('voice')
    this.file = `${this.tmpdir}/phrase` + Date.now() + '.mp3'
    const config = (child) => {
      return child
        .addInputOptions(`-f s16le -ar ${rate_2} -ac 1`.split(` `))
        .outputOptions(`-c:a libmp3lame -b:a 64k -ac 1 -f mp3 -af atrim=start=0.05,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.06`.split(` `))
        .output(this.file)
    }
    this.recorder = new Recorder(config)
    this.recorder.stream.on('error', (err) => this.emit('error', err))
    this.recorder.start()
  }

  _next() {
    this.recorder.stop()
    this.recorder = null
    setTimeout(() => {
      const short = this.file.replace('.mp3', '.short.mp3')
      truncate(this.file, short)
        .then(() => this.emit('next', short))
        .catch((err) => this.emit('warn', err))
    }, 200)
  }

  _mic1(data) {
    if (!this.vad) { return }
    this.vad.stdin.write(data)
  }

  _mic2(data) {
    if (this._mute) { return }
    const earlySamples = Math.ceil(rate_2 * 0.3)
    this.early = Buffer.concat([this.early, data])
    this.early = this.early.slice(-1 * Math.floor(earlySamples * 2))
    if (!this.speaking) { return }
    if (!this.recorder) { return }
    this.recorder.stream.write(data)
  }

  _vad(score) {
    if (this._mute) { return }
    const frame_sz = 256
    const earlySamples = Math.ceil(rate_1 * 0.3)
    const earlyScores = Math.ceil(earlySamples / frame_sz)
    this.scores.push(parseFloat(score))
    const ready = this.scores.length >= earlyScores
    this.scores = this.scores.slice(-1 * earlyScores)
    score = this.scores.reduce((acc, s) => acc + s, 0) / this.scores.length
    const loud = ready && score >= 0.75

    if (!this.speaking && loud) {
      this.speaking = true
      this._voice()
      const earlySamples = Math.ceil(rate_2 * 0.3)
      this.early = this.early.slice(-1 * Math.floor(earlySamples * 2))
      this.recorder.stream.write(this.early)
      this.early = Buffer.alloc(0)
    } else if (this.speaking && !loud) {
      this.quiet++
      const quietSeconds = (this.quiet * frame_sz) / rate_1
      if (quietSeconds >= 2.0) {
        this._next()
        this.speaking = false
        this.early = Buffer.alloc(0)
        this.scores = []
        this.quiet = 0
      }
    } else if (this.speaking) {
      this.quiet = 0
    }
  }
}
