import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADMIN_BASE } from '../lib/adminPath'

const HOLD_MS = 1500 // how long to hold the secret bead

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
  const nav = useNavigate()
  const timerRef = useRef(null)

  const startHold = () => {
    timerRef.current = setTimeout(() => {
      nav(`${ADMIN_BASE}/login`)
    }, HOLD_MS)
  }
  const cancelHold = () => clearTimeout(timerRef.current)

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, var(--bd))' }} />
      {BEADS.map((b, i) => (
        <div
          key={i}
          onMouseDown={b.secret ? startHold : undefined}
          onMouseUp={b.secret ? cancelHold : undefined}
          onMouseLeave={b.secret ? cancelHold : undefined}
          onTouchStart={b.secret ? startHold : undefined}
          onTouchEnd={b.secret ? cancelHold : undefined}
          onContextMenu={b.secret ? (e) => e.preventDefault() : undefined}
          style={{
            width: b.size, height: b.size,
            borderRadius: '50%',
            background: b.color,
            opacity: b.opacity,
            margin: '0 3px',
            flexShrink: 0,
            WebkitTouchCallout: b.secret ? 'none' : undefined,
            userSelect: b.secret ? 'none' : undefined,
          }}
        />
      ))}
      <div style={{ width: 60, height: 1, background: 'linear-gradient(to left, transparent, var(--bd))' }} />
    </div>
  )
}