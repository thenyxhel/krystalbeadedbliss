import { Link } from 'react-router-dom'
import { CONFIG } from '../lib/config'

/**
 * The mark: five beads on a thread, largest at the centre — the shape a
 * necklace makes when it is laid flat. It replaces a gradient circle with a
 * generic emoji inside it, and unlike that circle it stays legible at 20px.
 */
export function Mark({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 32 24" width={(size * 32) / 24} height={size} className={className} aria-hidden="true" focusable="false">
      <path
        d="M3 4a13 13 0 0 0 26 0"
        fill="none"
        stroke="var(--clay)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="4.4"  cy="6.0"  r="2.0" fill="var(--brass)" />
      <circle cx="9.6"  cy="11.2" r="2.6" fill="var(--sage)" />
      <circle cx="16"   cy="13.4" r="3.4" fill="var(--clay)" />
      <circle cx="22.4" cy="11.2" r="2.6" fill="var(--sage)" />
      <circle cx="27.6" cy="6.0"  r="2.0" fill="var(--brass)" />
    </svg>
  )
}

/** Mark + wordmark, linked home. `compact` drops the tagline. */
export default function Brand({ compact = false, size = 26 }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-3 no-underline"
      aria-label={`${CONFIG.name} — home`}
    >
      <Mark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className="font-display text-ink"
          style={{ fontSize: compact ? '0.9375rem' : '1.0625rem', fontWeight: 500, letterSpacing: '-0.015em' }}
        >
          Krystal Beaded Bliss
        </span>
        {!compact && (
          <span
            className="text-ink-3 mt-1"
            style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}
          >
            {CONFIG.tagline}
          </span>
        )}
      </span>
    </Link>
  )
}
