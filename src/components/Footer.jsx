import { Link } from 'react-router-dom'
import BeadDivider from './BeadDivider'
import { CONFIG } from '../lib/config'

const TICKER_ITEMS = [
  '✦ Handcrafted with love', '✦ Ready in 1 business day', '✦ Nationwide delivery',
  '✦ Custom orders welcome', '✦ 100% handmade', '✦ Made in Lagos',
  '✦ Handcrafted with love', '✦ Ready in 1 business day', '✦ Nationwide delivery',
  '✦ Custom orders welcome', '✦ 100% handmade', '✦ Made in Lagos',
]

export default function Footer() {
  // Footer shop links — no anklets, Earrings spelled correctly
  const shopLinks = [
    { to: '/shop?category=bracelet', label: 'Bracelets' },
    { to: '/shop?category=necklace', label: 'Necklaces' },
    { to: '/shop?category=earrings', label: 'Earrings' },
    { to: '/shop?category=set',      label: 'Sets' },
  ]

  const helpLinks = [
    { to: '/custom',    label: 'Custom Order' },
    { to: '/track',     label: 'Track Order' },
    { to: '/complaint', label: 'File a Complaint' },
  ]

  return (
    <footer>
      {/* Ticker */}
      <div style={{ background: 'var(--purple)', overflow: 'hidden', padding: '10px 0' }}>
        <div className="marquee-track flex whitespace-nowrap">
          {TICKER_ITEMS.map((t, i) => (
            <span key={i} style={{ display: 'inline-block', padding: '0 32px', fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Pre-footer CTA */}
      <div style={{ background: 'var(--surf)', borderTop: '1px solid var(--bd)', padding: '48px 24px', textAlign: 'center' }}>
        <p className="font-display italic text-2xl mb-1" style={{ color: 'var(--purple)' }}>
          Can't find what you're looking for?
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--tx2)' }}>
          Visit our sister store for more beautiful things
        </p>
        <a
          href={CONFIG.sweetSoiree}
          target="_blank"
          rel="noreferrer"
          className="font-display font-semibold text-xl no-underline transition-all hover:opacity-80"
          style={{ color: 'var(--gold)' }}
        >
          The Sweet Soirée ✦
        </a>
      </div>

      {/* Main footer */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--bd)', padding: '48px 24px 32px' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--purple), var(--purple2))',
                  border: '2px solid var(--gold)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="15" height="15" viewBox="0 0 20 20">
                    <circle cx="6" cy="10" r="2.5" fill="white" opacity=".75"/>
                    <circle cx="10" cy="6" r="2" fill="white" opacity=".55"/>
                    <circle cx="14" cy="10" r="2.5" fill="white" opacity=".75"/>
                    <circle cx="10" cy="14" r="2" fill="white" opacity=".55"/>
                  </svg>
                </div>
                <div>
                  <div className="font-display font-semibold text-sm" style={{ color: 'var(--tx)' }}>
                    Krystal Beaded Bliss
                  </div>
                  <div className="font-script" style={{ color: 'var(--gold)', fontSize: 11 }}>
                    ....Be"U"tiful
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>
                Handcrafted bead jewellery made with love in Lagos, Nigeria.
              </p>
            </div>

            {/* Shop */}
            <div>
              <p className="section-eyebrow mb-3">Shop</p>
              {shopLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block text-sm mb-2 no-underline transition-colors"
                  style={{ color: 'var(--tx2)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--purple)'}
                  onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Help */}
            <div>
              <p className="section-eyebrow mb-3">Help</p>
              {helpLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block text-sm mb-2 no-underline transition-colors"
                  style={{ color: 'var(--tx2)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--purple)'}
                  onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Contact */}
            <div>
              <p className="section-eyebrow mb-3">Connect</p>
              <a
                href={`https://wa.me/${CONFIG.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-white px-4 py-2 rounded-full mb-3 no-underline transition-all hover:scale-105"
                style={{ background: '#25d366' }}
              >
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 13, height: 13, flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>

          <BeadDivider className="mb-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>
              © {new Date().getFullYear()} Krystal Beaded Bliss · Lagos, Nigeria
            </p>
            <p className="font-script text-sm" style={{ color: 'var(--lavender)' }}>
              Handcrafted with love 💜
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
