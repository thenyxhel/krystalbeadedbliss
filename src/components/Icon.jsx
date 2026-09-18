/**
 * The icon set.
 *
 * Emoji used to do this job. Emoji render as a different picture on every
 * device, cannot take the brand colour, and cannot be sized against the type
 * scale — so the category "icons" were literally whatever Apple, Google and
 * Samsung each decided a prayer bead looks like. These are drawn once, inherit
 * currentColor, and align to the text baseline.
 *
 * Decorative by default (aria-hidden). Pass a `title` to expose one to
 * assistive technology.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const PATHS = {
  /* ── Category marks — beads, drawn ── */
  bracelet: (
    <>
      <circle cx="12" cy="12" r="7" {...STROKE} strokeDasharray="0.1 3.4" strokeWidth={2.4} />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
    </>
  ),
  necklace: (
    <>
      <path d="M5 5a7 7 0 0 0 14 0" {...STROKE} strokeDasharray="0.1 3.2" strokeWidth={2.2} />
      <path d="M12 12v3" {...STROKE} />
      <circle cx="12" cy="17.5" r="3" fill="currentColor" />
    </>
  ),
  earrings: (
    <>
      <path d="M8 4.5a2.5 2.5 0 0 0-2.5 2.5v2" {...STROKE} />
      <circle cx="5.5" cy="13" r="3" fill="currentColor" />
      <path d="M16 4.5A2.5 2.5 0 0 1 18.5 7v2" {...STROKE} />
      <circle cx="18.5" cy="13" r="3" fill="currentColor" />
    </>
  ),
  set: (
    <>
      <path d="M4 6a8 8 0 0 0 10 3" {...STROKE} strokeDasharray="0.1 3.2" strokeWidth={2.2} />
      <circle cx="15" cy="15" r="5.5" {...STROKE} strokeDasharray="0.1 3.2" strokeWidth={2.2} />
    </>
  ),
  watch: (
    <>
      <circle cx="12" cy="12" r="5.2" {...STROKE} />
      <path d="M12 9.6V12l1.7 1.2" {...STROKE} />
      <path d="M9.4 7.2 9.8 3.6h4.4l.4 3.6M9.4 16.8l.4 3.6h4.4l.4-3.6" {...STROKE} />
    </>
  ),
  keychain: (
    <>
      <circle cx="8" cy="8" r="4.2" {...STROKE} />
      <path d="m11 11 4.2 4.2" {...STROKE} />
      <circle cx="17.4" cy="17.4" r="2.6" fill="currentColor" />
    </>
  ),
  bagcharm: (
    <>
      <path d="M8.5 4.5h7l1.2 3.2H7.3z" {...STROKE} />
      <path d="M9.5 7.7v2.1a2.5 2.5 0 0 0 5 0V7.7" {...STROKE} />
      <path d="M12 12v2.2" {...STROKE} />
      <circle cx="12" cy="17.4" r="3.2" fill="currentColor" />
    </>
  ),
  beaded: (
    <>
      <circle cx="5" cy="12" r="2.4" fill="currentColor" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      <circle cx="19" cy="12" r="2.4" fill="currentColor" />
    </>
  ),
  chains: (
    <>
      <ellipse cx="7" cy="12" rx="4" ry="2.8" {...STROKE} />
      <ellipse cx="14.5" cy="12" rx="4" ry="2.8" {...STROKE} />
      <ellipse cx="21" cy="12" rx="2.4" ry="2.8" {...STROKE} />
    </>
  ),

  /* ── Interface ── */
  cart: (
    <>
      <path d="M6 7h13l-1.3 8.2a2 2 0 0 1-2 1.7H9.3a2 2 0 0 1-2-1.7L5.7 4.8A1 1 0 0 0 4.7 4H3" {...STROKE} />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" />
      <circle cx="16.5" cy="20" r="1.3" fill="currentColor" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" {...STROKE} />
      <path d="m20 20-4.4-4.4" {...STROKE} />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" {...STROKE} />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" {...STROKE} />
    </>
  ),
  moon: <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z" {...STROKE} />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" {...STROKE} />,
  close: <path d="M6 6l12 12M18 6L6 18" {...STROKE} />,
  check: <path d="m5 12.5 4.5 4.5L19 7" {...STROKE} />,
  plus: <path d="M12 5v14M5 12h14" {...STROKE} />,
  minus: <path d="M5 12h14" {...STROKE} />,
  arrowRight: <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" {...STROKE} />,
  arrowLeft: <path d="M20 12H5m5.5-5.5L5 12l5.5 5.5" {...STROKE} />,
  chevronDown: <path d="m6 9.5 6 6 6-6" {...STROKE} />,
  chevronRight: <path d="m9.5 6 6 6-6 6" {...STROKE} />,
  copy: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2" {...STROKE} />
      <path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8C3 3.8 3.8 3 4.8 3h8.4c1 0 1.8.8 1.8 1.8v.7" {...STROKE} />
    </>
  ),
  star: (
    <path
      d="m12 3.5 2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.95l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9Z"
      {...STROKE}
    />
  ),
  upload: (
    <>
      <path d="M12 16V4.5m-4.5 4L12 4l4.5 4.5" {...STROKE} />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" {...STROKE} />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" {...STROKE} />
      <circle cx="9" cy="10" r="1.6" {...STROKE} />
      <path d="m4.5 17 4.8-4.3a2 2 0 0 1 2.7 0l3.2 3 1.7-1.5a2 2 0 0 1 2.6 0l1 .9" {...STROKE} />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" {...STROKE} />
      <path d="M6.5 7.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7.5" {...STROKE} />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" {...STROKE} />
      <path d="M12 7.5v5.5" {...STROKE} />
      <circle cx="12" cy="16.4" r="1" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" {...STROKE} />
      <path d="M12 11v5.5" {...STROKE} />
      <circle cx="12" cy="7.8" r="1" fill="currentColor" />
    </>
  ),
  package: (
    <>
      <path d="M20.5 8.2v7.6a1.6 1.6 0 0 1-.85 1.4l-6.9 3.6a1.6 1.6 0 0 1-1.5 0l-6.9-3.6a1.6 1.6 0 0 1-.85-1.4V8.2" {...STROKE} />
      <path d="m3.8 7.6 7.45-3.9a1.6 1.6 0 0 1 1.5 0l7.45 3.9L12 12 3.8 7.6Z" {...STROKE} />
      <path d="M12 12v8.9" {...STROKE} />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11v9h-11z" {...STROKE} />
      <path d="M13.5 10h3.8l2.7 3v2.5h-6.5z" {...STROKE} />
      <circle cx="7" cy="17.5" r="1.8" {...STROKE} />
      <circle cx="17" cy="17.5" r="1.8" {...STROKE} />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" {...STROKE} />
      <path d="m3.8 7 7.2 5.4a1.7 1.7 0 0 0 2 0L20.2 7" {...STROKE} />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21Z" {...STROKE} />
      <circle cx="12" cy="10.6" r="2.4" {...STROKE} />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 16.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19V5a1.5 1.5 0 0 1 1.5-1.5H13A1.5 1.5 0 0 1 14.5 5v2.5" {...STROKE} />
      <path d="M9.5 12H21m-4 -4 4 4-4 4" {...STROKE} />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...STROKE} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...STROKE} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...STROKE} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" {...STROKE} />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...STROKE} />
      <circle cx="16" cy="7" r="2" {...STROKE} />
      <circle cx="10" cy="17" r="2" {...STROKE} />
    </>
  ),
  chat: (
    <path d="M20.5 11.7c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.6-.35L4.5 20l1.2-3.5A6.8 6.8 0 0 1 3.5 11.7c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" {...STROKE} />
  ),
  whatsapp: (
    <path
      fill="currentColor"
      d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.28-.1-.48-.15-.68.15s-.76.96-.93 1.16c-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.18-.3-.02-.46.13-.6.14-.14.3-.35.44-.53.15-.17.2-.3.3-.5s.05-.36-.02-.51c-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.7.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.28.18-1.41-.08-.12-.28-.2-.58-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26C2.16 6.46 6.6 2.02 12.05 2.02c2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.09.54 4.14 1.58 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.23-6.16-3.48-8.4Z"
    />
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...STROKE} />
      <circle cx="12" cy="12" r="4" {...STROKE} />
      <circle cx="17" cy="7" r="1.1" fill="currentColor" />
    </>
  ),
  spinner: (
    <>
      <circle cx="12" cy="12" r="8.5" {...STROKE} opacity="0.25" />
      <path d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5" {...STROKE} />
    </>
  ),
}

export default function Icon({ name, size = 20, title, className = '', ...rest }) {
  const path = PATHS[name]
  if (!path) return null

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      style={{ flexShrink: 0 }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  )
}

export const ICON_NAMES = Object.keys(PATHS)
