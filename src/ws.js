import { WebSocketServer } from 'ws'

const send = (ws, msg) => {
  try {
    ws.send(msg)
  } catch (err) { }
}

export function avatarWs() {
  const server = new WebSocketServer({ port: 8083, clientTracking: true })
  let recent = null

  server.on('connection', (ws) => {
    recent && send(ws, recent)
    ws.on('close', () => setTimeout(() => ws.terminate(), 2000))
    ws.on('error', (err) => ws.close())
  })

  return (msg) => {
    msg = recent = JSON.stringify(msg)
    server.clients.forEach((ws) => send(ws, msg))
  }
}
