import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useSeo } from '../lib/useSeo'
import { fmt } from '../lib/utils'
import { categoryLabel } from '../lib/config'
import Icon from '../components/Icon'
import { Mark } from '../components/Brand'

export default function CartPage() {
  const { items, remove, updateQty, subtotal, count } = useCart()
  const navigate = useNavigate()

  useSeo({ title: 'Your cart', noindex: true })

  if (items.length === 0) {
    return (
      <div className="page-narrow py-24 text-center">
        <Mark size={44} className="mx-auto opacity-60" />
        <h1 className="h1 mt-6">Your cart is empty.</h1>
        <p className="text-ink-2 mt-3">Nothing in here yet — the collection is a good place to start.</p>
        <div className="flex gap-2 justify-center mt-7">
          <Link to="/shop" className="btn btn-primary no-underline">
            Browse the collection
          </Link>
          <Link to="/custom" className="btn btn-outline no-underline">
            Design your own
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page py-10">
      <header className="mb-9">
        <p className="eyebrow mb-2">Your selection</p>
        <h1 className="h1">
          Cart <span className="numeric text-ink-3">({count})</span>
        </h1>
      </header>

      <div className="grid lg:grid-cols-12 gap-10">
        <ul className="lg:col-span-7 list-none p-0 m-0 flex flex-col">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex gap-4 py-5"
              style={{ borderTop: index === 0 ? '1px solid var(--line)' : 'none', borderBottom: '1px solid var(--line)' }}
            >
              <Link
                to={`/product/${item.slug || item.id}`}
                className="frame flex-shrink-0 no-underline"
                style={{ width: 88 }}
                aria-hidden="true"
                tabIndex={-1}
              >
                {item.image ? (
                  <img src={item.image} alt="" loading="lazy" decoding="async" width="176" height="220" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center opacity-40">
                    <Mark size={26} />
                  </span>
                )}
              </Link>

              <div className="flex-1 min-w-0 flex flex-col">
                <p className="eyebrow" style={{ fontSize: '0.625rem' }}>
                  {categoryLabel(item.category)}
                </p>
                <h2 className="h3 mt-1">
                  <Link to={`/product/${item.slug || item.id}`} className="no-underline text-ink hover:text-accent">
                    {item.name}
                  </Link>
                </h2>
                <p className="meta numeric mt-1">{fmt(item.price)} each</p>

                <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center" style={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ borderRadius: 0, padding: '0.375rem 0.625rem' }}
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <Icon name="minus" size={15} />
                    </button>
                    <span className="numeric px-3 text-sm font-semibold">{item.qty}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ borderRadius: 0, padding: '0.375rem 0.625rem' }}
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      disabled={item.qty >= Math.min(20, item.stock)}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <Icon name="plus" size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="numeric font-display text-lg" style={{ fontWeight: 500 }}>
                      {fmt(item.price * item.qty)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="btn btn-ghost btn-sm text-ink-3"
                      style={{ padding: '0.375rem' }}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:col-span-5">
          <div className="card p-6 lg:sticky" style={{ top: 88 }}>
            <h2 className="h3 mb-5">Summary</h2>

            <div className="flex justify-between py-2 text-sm">
              <span className="text-ink-2">Subtotal</span>
              <span className="numeric font-semibold">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-ink-2">Delivery</span>
              <span className="text-ink-3">Arranged after confirmation</span>
            </div>

            <hr className="hairline my-4" />

            <div className="flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="numeric font-display" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
                {fmt(subtotal)}
              </span>
            </div>

            {/* Said plainly, because it is true: the figure above is what we
                expect, and the server is what decides. */}
            <p className="help mt-2">
              Prices are confirmed against our stock when you place the order.
            </p>

            <button type="button" className="btn btn-primary btn-block mt-6" onClick={() => navigate('/checkout')}>
              Checkout
              <Icon name="arrowRight" size={17} />
            </button>
            <Link to="/shop" className="btn btn-ghost btn-block mt-2 no-underline">
              Keep shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
