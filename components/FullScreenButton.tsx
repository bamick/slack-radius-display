'use client'

import { useState, useEffect } from 'react'

export default function FullScreenButton() {
  const [supported, setSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setSupported(!!document.documentElement.requestFullscreen)

    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (!supported) return null

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  return (
    <button className="fullscreen-btn" onClick={toggle}>
      {isFullscreen ? '✕' : '+'}
    </button>
  )
}
