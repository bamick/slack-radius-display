'use client'

import { useState, useEffect, useCallback } from 'react'
import FullScreenButton from './FullScreenButton'
import '../styles/display.css'

interface Message {
  id: string
  userName: string
  userImage: string | null
  text: string
  time: string
  timestamp: string
}

interface DisplayFeedProps {
  displayKey: string
}

function formatTime(timestamp: string): string {
  const ms = parseFloat(timestamp) * 1000
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function DisplayFeed({ displayKey }: DisplayFeedProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const refreshSeconds = 120

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages?key=${encodeURIComponent(displayKey)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()

      if (res.status === 401) {
        setIsUnauthorized(true)
        return
      }

      if (!data.ok) {
        setError('Unable to load new messages.')
        return
      }

      setMessages(data.messages)
      setUpdatedAt(data.updatedAt)
      setError(null)
    } catch {
      setError('Unable to load new messages.')
    }
  }, [displayKey])

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, refreshSeconds * 1000)
    return () => clearInterval(interval)
  }, [loadMessages])


  if (isUnauthorized) {
    return (
      <div className="display-error-page">
        <p>Display access is not configured.</p>
      </div>
    )
  }

  return (
    <main className="display-page">
      <header className="display-header">
        <div className="display-header-titles">
          <h1 className="display-title">Radius Cowork Updates</h1>
          <p className="display-subtitle">Live from Slack #general</p>
        </div>
        <FullScreenButton />
      </header>

      <div className="display-feed">
        {messages.length === 0 && !error ? (
          <div className="display-no-messages">No recent messages.</div>
        ) : (
          messages.map((msg) => (
            <article key={msg.id} className="message-card">
              <div className="message-meta">
                <span className="message-author">{msg.userName}</span>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
              <p
                className="message-text"
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            </article>
          ))
        )}
      </div>

      <footer className="display-footer">
        <div className="display-footer-left">
          {updatedAt && (
            <p className="display-updated">
              Last updated {formatUpdatedAt(updatedAt)}
            </p>
          )}
          <p className="display-tagline">Visible in the common area</p>
        </div>
        {error && <p className="display-error-banner">{error}</p>}
      </footer>
    </main>
  )
}
