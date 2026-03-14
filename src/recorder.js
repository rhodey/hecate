import { PassThrough } from 'stream'
import { StreamInput } from 'fluent-ffmpeg-multistream'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffmpeg from '@bropat/fluent-ffmpeg'
ffmpeg.setFfmpegPath(ffmpegPath.path)

export class Recorder {
  constructor(config) {
    this.config = config
    this.stream = new PassThrough()
  }

  start() {
    this.child = ffmpeg()
      .withProcessOptions({ detached: true })
      .addInput(new StreamInput(this.stream).url)
      .on('error', (err) => this.stream.emit('error', err))
    this.child = this.config(this.child)
    this.child.run()
  }

  stop() {
    if (!this.child) { return }
    const child = this.child
    this.child = null
    this.stream.end()
    const kill = () => {
      this.stream.removeAllListeners()
      child.kill('SIGKILL')
    }
    setTimeout(kill, 1000)
  }
}
