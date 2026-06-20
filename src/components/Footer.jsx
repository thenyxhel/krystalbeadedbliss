import { Link } from 'react-router-dom'
import BeadDivider from './BeadDivider'
import { CONFIG } from '../lib/config'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--surf)', borderTop: '1px solid var(--bd)' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <BeadDivider className="mb-10" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-serif text-xl font-semibold mb-1" style={{ color: 'var(--tx)' }}>
              Krystal's
            </div>
            <div className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--gold)' }}>
              Beaded Bliss
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>
              Handcrafted bead jewellery made with love in Lagos, Nigeria.
            </p>
          </div>

          {/* Shop */}
          <div>
            <p className="section-eyebrow mb-3">Shop</p>
            {['bracelet', 'necklace', 'earrings', 'anklet', 'set'].map(c => (
              <Link
                key={c}
                to={`/shop?category=${c}`}
                className="block text-sm mb-2 capitalize transition-colors"
                style={{ color: 'var(--tx2)', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--gold)'}
                onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
              >
                {c === 'set' ? 'Sets' : c + 's'}
              </Link>
            ))}
          </div>

          {/* Help */}
          <div>
            <p className="section-eyebrow mb-3">Help</p>
            {[
              { to: '/custom',    label: 'Custom Order' },
              { to: '/track',     label: 'Track Order' },
              { to: '/complaint', label: 'File a Complaint' },
            ].map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="block text-sm mb-2 transition-colors"
                style={{ color: 'var(--tx2)', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--gold)'}
                onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <p className="section-eyebrow mb-3">Contact</p>
            <a
              href={`https://wa.me/${CONFIG.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="block text-sm mb-2 transition-colors"
              style={{ color: 'var(--tx2)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--gold)'}
              onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
            >
              WhatsApp
            </a>
            <a
              href={CONFIG.sweetSoiree}
              target="_blank"
              rel="noreferrer"
              className="block text-sm mb-2 transition-colors"
              style={{ color: 'var(--tx2)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--gold)'}
              onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
            >
              The Sweet Soirée ↗
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center pt-6" style={{ borderTop: '1px solid var(--bd)' }}>
          <p className="text-xs" style={{ color: 'var(--tx2)' }}>
            © {new Date().getFullYear()} Krystal's Beaded Bliss. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}