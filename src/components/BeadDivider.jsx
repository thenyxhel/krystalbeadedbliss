import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_BASE } from '../lib/adminPath'

const HOLD_MS = 1200 // hold time to trigger

function SecretBead({ size, color, opacity }) {
  const nav = useNavigate()
  const timerRef  = useRef(null)
  const activeRef = useRef(false)

  const clearHold = () => {
    activeRef.current = false
    clearTimeout(timerRef.current)
  }

  const startHold = (e) => {
    e.preventDefault()
    activeRef.current = true
    timerRef.current = setTimeout(() => {
      if (activeRef.current) nav(`${ADMIN_BASE}/login`)
    }, HOLD_MS)
  }

  // Listen on the whole window for release — so a little finger/mouse
  // drift off the tiny dot doesn't cancel the hold early.
  useEffect(() => {
    const onUp = () => clearHold()
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
    }
  }, [])

  return (
    <div
      onMouseDown={startHold}
      onTouchStart={startHold}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        // Real hit area is much bigger than the visible dot —
        // the dot itself stays tiny and unchanged visually.
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 -7px', // compensate so layout spacing matches the other beads
        flexShrink: 0,
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div style={{ width: size, height: size, borderRadius: '50%', background: color, opacity }} />
    </div>
  )
}

const BEADS = [
  { size: 8,  color: 'var(--pink)',  opacity: 0.65 },
  { size: 10, color: 'var(--gold)',  opacity: 0.85 },
  { size: 8,  color: 'var(--tx)',    opacity: 0.3, secret: true }, // 🔒 long-press → admin
  { size: 12, color: 'var(--gold)',  opacity: 1    },
  { size: 8,  color: 'var(--pink)',  opacity: 0.65 },
  { size: 10, color: 'var(--tx)',    opacity: 0.3  },
  { size: 8,  color: 'var(--gold)',  opacity: 0.75 },
]

export default function BeadDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, var(--bd))' }} />
      {BEADS.map((b, i) =>
        b.secret ? (
          <SecretBead key={i} size={b.size} color={b.color} opacity={b.opacity} />
        ) : (
          <div
            key={i}
            style={{
              width: b.size, height: b.size,
              borderRadius: '50%',
              background: b.color,
              opacity: b.opacity,
              margin: '0 3px',
              flexShrink: 0,
            }}
          />
        )
      )}
      <div style={{ width: 60, height: 1, background: 'linear-gradient(to left, transparent, var(--bd))' }} />
    </div>
  )
}