/**
 * A hairline with three beads at the centre.
 *
 * This replaces BeadDivider, which hid a 1,200ms long-press on one of its
 * beads that navigated to the admin login. That was a puzzle for the owner,
 * not a security control — the admin path shipped in the JS bundle in plain
 * text either way. The divider is now just a divider.
 */
export default function Rule({ className = '', tone = 'default' }) {
  const beads =
    tone === 'quiet'
      ? ['var(--line-strong)', 'var(--line-strong)', 'var(--line-strong)']
      : ['var(--brass)', 'var(--clay)', 'var(--sage)']

  return (
    <div className={`flex items-center gap-3 ${className}`} role="presentation">
      <span className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      <span className="flex items-center gap-1.5">
        {beads.map((color, i) => (
          <span
            key={i}
            style={{
              width: i === 1 ? 7 : 5,
              height: i === 1 ? 7 : 5,
              borderRadius: '50%',
              background: color,
              opacity: i === 1 ? 1 : 0.7,
            }}
          />
        ))}
      </span>
      <span className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}
