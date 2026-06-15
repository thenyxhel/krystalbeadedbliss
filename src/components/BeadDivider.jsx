const BEADS = [
  { size: 8,  color: 'var(--pink)',  opacity: 0.65 },
  { size: 10, color: 'var(--gold)',  opacity: 0.85 },
  { size: 8,  color: 'var(--tx)',    opacity: 0.3  },
  { size: 12, color: 'var(--gold)',  opacity: 1    },
  { size: 8,  color: 'var(--pink)',  opacity: 0.65 },
  { size: 10, color: 'var(--tx)',    opacity: 0.3  },
  { size: 8,  color: 'var(--gold)',  opacity: 0.75 },
]

export default function BeadDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, var(--bd))' }} />
      {BEADS.map((b, i) => (
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
      ))}
      <div style={{ width: 60, height: 1, background: 'linear-gradient(to left, transparent, var(--bd))' }} />
    </div>
  )
}
