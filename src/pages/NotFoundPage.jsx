import { Link } from 'react-router-dom'
import { useSeo } from '../lib/useSeo'
import { Mark } from '../components/Brand'

/**
 * A page that says what happened.
 *
 * Every unknown URL used to `<Navigate to="/" replace />`, which told the
 * visitor nothing and told search engines that a mistyped address was a real
 * page returning real content.
 */
export default function NotFoundPage() {
  useSeo({ title: 'Page not found', noindex: true })

  return (
    <div className="page-narrow py-28 text-center">
      <Mark size={46} className="mx-auto opacity-60" />
      <p className="eyebrow mt-7 mb-3">404</p>
      <h1 className="h1">This page does not exist.</h1>
      <p className="text-ink-2 mt-4 mx-auto" style={{ maxWidth: '40ch' }}>
        The link may be old, or there may be a typo in the address. Everything else is
        still where you left it.
      </p>

      <div className="flex flex-wrap gap-2.5 justify-center mt-8">
        <Link to="/shop" className="btn btn-primary no-underline">
          Browse the collection
        </Link>
        <Link to="/track" className="btn btn-outline no-underline">
          Track an order
        </Link>
        <Link to="/" className="btn btn-ghost no-underline">
          Home
        </Link>
      </div>
    </div>
  )
}
