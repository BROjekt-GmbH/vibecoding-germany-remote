import type { Namespace } from 'socket.io'
import { execOnHost } from '../ssh/client'

export function setupLogsNamespace(ns: Namespace) {
  ns.on('connection', (socket) => {
    let tailInterval: ReturnType<typeof setInterval> | null = null
    let lastSize = 0

    socket.on('logs:subscribe', async ({ hostId, filename }: { hostId: string; filename: string }) => {
      if (filename.includes('/') || filename.includes('..')) return
      try {
        const content = await execOnHost(hostId, `tail -n 100 ~/.claude/logs/${JSON.stringify(filename)}`)
        socket.emit('logs:data', { content })
        const sizeOut = await execOnHost(hostId, `stat -c%s ~/.claude/logs/${JSON.stringify(filename)} 2>/dev/null || echo 0`)
        lastSize = parseInt(sizeOut.trim()) || 0
      } catch { /* Host nicht erreichbar */ }
      tailInterval = setInterval(async () => {
        try {
          const sizeOut = await execOnHost(hostId, `stat -c%s ~/.claude/logs/${JSON.stringify(filename)} 2>/dev/null || echo 0`)
          const newSize = parseInt(sizeOut.trim()) || 0
          if (newSize > lastSize) {
            const diff = newSize - lastSize
            const content = await execOnHost(hostId, `tail -c ${diff} ~/.claude/logs/${JSON.stringify(filename)}`)
            socket.emit('logs:data', { content, append: true })
            lastSize = newSize
          }
        } catch { /* Polling-Fehler ignorieren */ }
      }, 2000)
    })
    socket.on('logs:unsubscribe', () => { if (tailInterval) clearInterval(tailInterval) })
    socket.on('disconnect', () => { if (tailInterval) clearInterval(tailInterval) })
  })
}
