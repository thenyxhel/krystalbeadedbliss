import { Link } from 'react-router-dom'
import { CONFIG, whatsappLink } from '../lib/config'
import { Mark } from './Brand'
import Icon from './Icon'

export default function Footer() {
  const year = new Date().getFullYear()
  const wa = whatsappLink('Hi! I have a question about a piece.')

  const shopLinks = CONFIG.categories.map((c) => ({
    to: `/shop?category=${c.key}`,
    label: c.label,
  }))

  const helpLinks = [
    { to: '/custom', label: 'Design your own' },
    { to: '/track', label: 'Track an order' },
    { to: '/complaint', label: 'Report a problem' },
  ]

  return (
    <footer className="no-print" style={{ background: 'var(--bg-sunk)', borderTop: '1px solid var(--line)' }}>
      {/* Sister store — a quiet cross-link, not a second hero. */}
      <div className="page py-12 text-center" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="eyebrow mb-2">Also from us</p>
        <a
          href={CONFIG.sisterStore.url}
          target="_blank"
          rel="noreferrer"
          className="h2 link no-underline inline-flex items-center gap-2"
        >
          {CONFIG.sisterStore.name}
          <Icon name="arrowRight" size={20} />
        </a>
        <p className="text-sm text-ink-3 mt-2">Sweets and celebration things, by the same hands.</p>
      </div>

      <div className="page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Mark size={30} />
            <p className="font-display text-ink mt-3" style={{ fontSize: '1.0625rem', fontWeight: 500 }}>
              {CONFIG.name}
            </p>
            <p className="text-sm text-ink-2 mt-2" style={{ maxWidth: '28ch' }}>
              Bead jewellery strung one piece at a time in {CONFIG.city}.
            </p>
          </div>

          <nav aria-labelledby="footer-shop">
            <p className="eyebrow mb-4" id="footer-shop">
              Shop
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {shopLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="link-quiet text-sm no-underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <p className="eyebrow mb-4" id="footer-help">
              Help
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {helpLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="link-quiet text-sm no-underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow mb-4">Talk to us</p>
            <div className="flex flex-col gap-3 items-start">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm no-underline">
                  <Icon name="whatsapp" size={16} />
                  WhatsApp
                </a>
              )}
              {CONFIG.instagram && (
                <a
                  href={CONFIG.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="link-quiet text-sm no-underline inline-flex items-center gap-2"
                >
                  <Icon name="instagram" size={16} />
                  Instagram
                </a>
              )}
              <p className="meta inline-flex items-center gap-1.5">
                <Icon name="pin" size={14} />
                {CONFIG.city}
              </p>
            </div>
          </div>
        </div>

        <hr className="hairline mt-12 mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="meta">
            © {year} {CONFIG.name}
          </p>
          <p className="meta">Every piece made by hand.</p>
        </div>
      </div>
    </footer>
  )
}
