import { Link } from 'react-router-dom'
import { CONFIG } from '../lib/config'

/**
 * THE MARK — a coil of beads.
 *
 * Two variants of the same gesture, because one drawing cannot serve a 300px
 * hero and a 16px browser tab. The full coil has 26 beads spiralling inward;
 * below about 40px those small beads merge into a smudge, so `compact`
 * switches to an evenly spaced ring of seven. This is ordinary practice in a
 * brand system — the mark stays recognisable, the detail scales with the
 * space available.
 *
 * Colours are theme tokens, not literals, so the mark follows the site
 * between light and dark instead of being a fixed picture pasted on top.
 */

const FULL = (
  <>
    <circle cx="20.79" cy="14.69" r="4.6" fill="var(--brand-pink)" />
    <circle cx="29.9" cy="11.64" r="2.58" fill="var(--brand-yellow)" />
    <circle cx="39.06" cy="11.7" r="2.05" fill="var(--brand-teal)" />
    <circle cx="46.9" cy="14.76" r="4.45" fill="var(--brand-violet)" />
    <circle cx="52.31" cy="20.28" r="2.51" fill="var(--brand-orange)" />
    <circle cx="54.55" cy="27.37" r="1.98" fill="var(--brand-pink)" />
    <circle cx="53.38" cy="34.92" r="4.29" fill="var(--brand-yellow)" />
    <circle cx="49.09" cy="41.82" r="2.44" fill="var(--brand-teal)" />
    <circle cx="42.4" cy="47.04" r="1.91" fill="var(--brand-violet)" />
    <circle cx="34.39" cy="49.87" r="4.14" fill="var(--brand-orange)" />
    <circle cx="26.28" cy="49.96" r="2.36" fill="var(--brand-pink)" />
    <circle cx="19.29" cy="47.4" r="1.84" fill="var(--brand-yellow)" />
    <circle cx="14.42" cy="42.64" r="3.98" fill="var(--brand-teal)" />
    <circle cx="12.31" cy="36.48" r="2.29" fill="var(--brand-violet)" />
    <circle cx="13.18" cy="29.87" r="1.77" fill="var(--brand-orange)" />
    <circle cx="16.81" cy="23.8" r="3.83" fill="var(--brand-pink)" />
    <circle cx="22.54" cy="19.17" r="2.22" fill="var(--brand-yellow)" />
    <circle cx="29.47" cy="16.6" r="1.7" fill="var(--brand-teal)" />
    <circle cx="36.51" cy="16.4" r="3.67" fill="var(--brand-violet)" />
    <circle cx="42.61" cy="18.52" r="2.15" fill="var(--brand-orange)" />
    <circle cx="46.91" cy="22.54" r="1.63" fill="var(--brand-pink)" />
    <circle cx="48.84" cy="27.8" r="3.52" fill="var(--brand-yellow)" />
    <circle cx="48.21" cy="33.47" r="2.08" fill="var(--brand-teal)" />
    <circle cx="45.21" cy="38.68" r="1.56" fill="var(--brand-violet)" />
    <circle cx="40.38" cy="42.69" r="3.36" fill="var(--brand-orange)" />
    <circle cx="34.53" cy="44.95" r="2.01" fill="var(--brand-pink)" />
  </>
)

const COMPACT = (
  <>
    <circle cx="25.44" cy="15.77" r="7.2" fill="var(--brand-pink)" />
    <circle cx="43.14" cy="15.73" r="5.4" fill="var(--brand-yellow)" />
    <circle cx="52.44" cy="27.94" r="7.2" fill="var(--brand-teal)" />
    <circle cx="46.35" cy="43.21" r="5.4" fill="var(--brand-violet)" />
    <circle cx="29.46" cy="50.03" r="7.2" fill="var(--brand-orange)" />
    <circle cx="14.48" cy="43.28" r="5.4" fill="var(--brand-pink)" />
    <circle cx="12.69" cy="28.03" r="7.2" fill="var(--brand-teal)" />
  </>
)

/**
 * @param size   rendered pixel size
 * @param detail 'auto' picks the variant from the size, or force 'full'/'compact'
 */
export function Mark({ size = 28, detail = 'auto', className = '', title }) {
  const useFull = detail === 'full' || (detail === 'auto' && size >= 44)

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      {title ? <title>{title}</title> : null}
      {useFull ? FULL : COMPACT}
    </svg>
  )
}

/** Mark plus wordmark, linked home. `compact` drops the tagline. */
export default function Brand({ compact = false, size = 30 }) {
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
          style={{
            fontSize: compact ? '0.9375rem' : '1.0625rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Krystal Beaded Bliss
        </span>
        {!compact && (
          <span
            className="mt-1"
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--brand-pink)',
            }}
          >
            {CONFIG.tagline}
          </span>
        )}
      </span>
    </Link>
  )
}
