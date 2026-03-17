'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ScrollText, RefreshCw, ArrowDown } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import type { Host } from '@/types'

interface LogFile {
  name: string
  size: string
  date: string
}

export default function LogsPage() {
  const [hosts, setHosts] = useState<Host[]>([])
  const [selectedHost, setSelectedHost] = useState<string>('')
  const [files, setFiles] = useState<LogFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveTail, setLiveTail] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const preRef = useRef<HTMLPreElement>(null)
  const socketRef = useRef<Socket | null>(null)

  // Hosts laden
  useEffect(() => {
    fetch('/api/hosts')
      .then(r => r.json())
      .then(data => {
        const list: Host[] = Array.isArray(data) ? data : []
        setHosts(list.filter(h => h.isOnline))
      })
      .catch(() => {})
  }, [])

  // Log-Dateien laden wenn Host gewaehlt
  useEffect(() => {
    if (!selectedHost) { setFiles([]); return }
    setFiles([])
    setSelectedFile('')
    setContent('')
    fetch(`/api/hosts/${selectedHost}/logs`)
      .then(r => r.json())
      .then(data => setFiles(data.files || []))
      .catch(() => setFiles([]))
  }, [selectedHost])

  // Auto-Scroll
  useEffect(() => {
    if (autoScroll && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [content, autoScroll])

  // Log-Datei laden (REST)
  const loadFile = useCallback(async (filename: string) => {
    setSelectedFile(filename)
    setContent('')
    setLoading(true)
    setLiveTail(false)
    // Alten Socket aufraumen
    if (socketRef.current) {
      socketRef.current.emit('logs:unsubscribe')
      socketRef.current.disconnect()
      socketRef.current = null
    }
    try {
      const res = await fetch(`/api/hosts/${selectedHost}/logs/${encodeURIComponent(filename)}?lines=500`)
      const data = await res.json()
      setContent(data.content || data.error || '')
    } catch {
      setContent('Fehler beim Laden der Log-Datei.')
    }
    setLoading(false)
  }, [selectedHost])

  // Live-Tail Toggle
  const toggleLiveTail = useCallback(() => {
    if (liveTail) {
      // Ausschalten
      if (socketRef.current) {
        socketRef.current.emit('logs:unsubscribe')
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setLiveTail(false)
      return
    }
    if (!selectedHost || !selectedFile) return
    // Einschalten
    setLiveTail(true)
    setAutoScroll(true)
    const socket = io('/logs', { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('logs:subscribe', { hostId: selectedHost, filename: selectedFile })
    })
    socket.on('logs:data', ({ content: newContent, append }: { content: string; append?: boolean }) => {
      if (append) {
        setContent(prev => prev + newContent)
      } else {
        setContent(newContent)
      }
    })
  }, [liveTail, selectedHost, selectedFile])

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('logs:unsubscribe')
        socketRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText size={20} className="text-[#22d3ee]" />
          <h1 className="text-lg font-semibold text-[#c8d6e5]">Log-Viewer</h1>
        </div>

        {/* Host-Selector */}
        <select
          value={selectedHost}
          onChange={e => setSelectedHost(e.target.value)}
          className="bg-[#0b0e11] border border-[#1a2028] text-[#c8d6e5] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-[#0e7490]"
        >
          <option value="">Host waehlen...</option>
          {hosts.map(h => (
            <option key={h.id} value={h.id}>{h.name || h.hostname}</option>
          ))}
        </select>
      </div>

      {/* Content-Bereich */}
      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Links: Datei-Liste */}
        <div className="panel w-64 flex-shrink-0 overflow-y-auto">
          <h2 className="text-xs font-medium text-[#4a5a6e] uppercase tracking-wider mb-2 px-2">
            Log-Dateien
          </h2>
          {files.length === 0 && selectedHost && (
            <p className="text-xs text-[#4a5a6e] px-2">Keine Logs gefunden.</p>
          )}
          {!selectedHost && (
            <p className="text-xs text-[#4a5a6e] px-2">Bitte Host waehlen.</p>
          )}
          {files.map(f => (
            <button
              key={f.name}
              onClick={() => loadFile(f.name)}
              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                selectedFile === f.name
                  ? 'bg-[#0e3a5e] text-[#22d3ee]'
                  : 'text-[#8a9bb0] hover:text-[#c8d6e5] hover:bg-[#0b0e11]'
              }`}
            >
              <div className="truncate font-mono">{f.name}</div>
              <div className="text-[10px] text-[#4a5a6e] mt-0.5">{f.size} B — {f.date}</div>
            </button>
          ))}
        </div>

        {/* Rechts: Log-Inhalt */}
        <div className="panel flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-[#1a2028] pb-2 mb-2">
            <span className="text-xs text-[#4a5a6e] font-mono truncate">
              {selectedFile || 'Keine Datei ausgewaehlt'}
            </span>
            <div className="flex items-center gap-2">
              {selectedFile && (
                <>
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    title="Auto-Scroll"
                    className={`p-1 rounded transition-colors ${
                      autoScroll ? 'text-[#22d3ee] bg-[#0e3a5e]' : 'text-[#4a5a6e] hover:text-[#8a9bb0]'
                    }`}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={toggleLiveTail}
                    title="Live-Tail"
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      liveTail
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                        : 'text-[#4a5a6e] hover:text-[#8a9bb0] border border-[#1a2028]'
                    }`}
                  >
                    {liveTail ? 'Live' : 'Tail'}
                  </button>
                  <button
                    onClick={() => loadFile(selectedFile)}
                    title="Neu laden"
                    className="p-1 text-[#4a5a6e] hover:text-[#8a9bb0] transition-colors"
                  >
                    <RefreshCw size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Log-Inhalt */}
          <pre
            ref={preRef}
            className="flex-1 overflow-auto text-xs font-mono text-[#c8d6e5] whitespace-pre-wrap break-all leading-relaxed"
          >
            {loading ? 'Lade...' : content || (selectedFile ? 'Leer.' : 'Waehle eine Log-Datei aus der Liste.')}
          </pre>
        </div>
      </div>
    </div>
  )
}
