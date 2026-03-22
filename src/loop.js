import fs from 'fs'
import { mkdirp } from 'mkdirp'
import { Phrases } from './phrases.js'
import { speak } from './speaker.js'
import { avatarWs } from './ws.js'
import { startPhone, waitForCall, waitForCallEnd } from './phone.js'
import { TinfoilAI } from 'tinfoil'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
const client = new TinfoilAI({ apiKey: process.env.tinfoil_key })

function onError(err) {
  console.log('error', err)
  process.exit(1)
}

async function loop() {
  await mkdirp('./speech')
  const audioModel = process.env.stt_model
  const llmModel = process.env.llm_model
  const voice = process.env.voice
  const avatar = process.env.avatar + '.vrm'
  console.log('!! audio', audioModel, 'llm', llmModel, 'voice', voice, 'avatar', avatar)

  const textFn = async (mp3) => {
    console.log('!! transcribe')
    let text = await client.audio.transcriptions.create({
      model: audioModel, language: (process.env.stt_language ?? 'en'),
      file: fs.createReadStream(mp3)
    })
    text = text.text.trim()
    console.log('user', text)
    return text
  }

  const phrases = new Phrases(textFn, './speech')
  const avSend = avatarWs()
  avSend({ avatar, animation: 'Idle' })

  let in_call = false
  let system = fs.readFileSync('default.txt', 'utf8')
  try {
    system = fs.readFileSync('prompt.txt', 'utf8')
  } catch (err) { }
  let history = [{ role: 'system', content: system }]

  phrases.on('voice', () => {
    console.log('!! user voice')
    avSend({ avatar, animation: 'Idle' })
  })

  phrases.on('next', async (mp3, text) => {
    if (!in_call) { return }
    phrases.mute(1)
    console.log('!! next')
    avSend({ avatar, animation: 'Idle' })

    console.log('user', text)
    history.push({ role: 'user', content: text })

    console.log('!! llm')
    text = await client.chat.completions.create({ model: llmModel, temperature: 1, messages: history })
    text = text.choices[0].message.content.trim()
    console.log('llm', text)
    history.push({ role: 'assistant', content: text })

    console.log('!! ai voice')
    avSend({ avatar, animation: 'Greeting', seek: 1000 })
    // fix pronunciation
    text = text.replaceAll(`Tinfoil.sh`, `Tinfoil`)
    await speak(text, voice)

    phrases.mute(0)
    console.log('!! ready')
    avSend({ avatar, animation: 'Idle' })

    // think @bropat/fluent-ffmpeg is to blame. no big deal.
    process.removeAllListeners('unhandledRejection')
    process.removeAllListeners('uncaughtException')
  })

  phrases.once('error', onError)
  phrases.mute(1)
  phrases.start()

  console.log('!! wait')
  await startPhone()
  console.log('!! ready')

  while (true) {
    const type = await waitForCall()
    console.log(`!! ${type} call`)
    phrases.mute(0)
    history = history.slice(0, 1)
    in_call = true
    avSend({ avatar, animation: 'Greeting', seek: 1000 })

    await waitForCallEnd()
    console.log(`!! call end`)
    phrases.mute(1)
    in_call = false
    avSend({ avatar, animation: 'Idle' })
  }
}

loop().catch(onError)
