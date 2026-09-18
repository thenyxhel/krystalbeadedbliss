import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CartCtx = createContext(null)
const KEY = 'kbb-cart-v2'
const MAX_QTY = 20

/**
 * The cart holds a *display snapshot* and nothing more.
 *
 * It used to store the entire product row, and checkout then sent those
 * prices to the server as fact. So a price edited in the admin panel never
 * reached a cart that was already open, and anyone willing to edit
 * localStorage could name their own total. Now the only thing that leaves
 * this file for the server is `{ product_id, quantity }` — place_order()
 * looks up every price itself. What is stored here is purely so the cart page
 * has something to draw before the server answers.
 */

const sanitise = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((i) => i && typeof i.id === 'string' && Number.isFinite(Number(i.price)))
    .map((i) => ({
      id: i.id,
      slug: typeof i.slug === 'string' ? i.slug : null,
      name: String(i.name ?? 'Item'),
      price: Number(i.price),
      image: typeof i.image === 'string' ? i.image : null,
      category: String(i.category ?? ''),
      stock: Number.isFinite(Number(i.stock)) ? Number(i.stock) : MAX_QTY,
      qty: Math.min(MAX_QTY, Math.max(1, Math.trunc(Number(i.qty) || 1))),
    }))
    .slice(0, 50)
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return sanitise(JSON.parse(localStorage.getItem(KEY)))
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* storage full or blocked — the cart still works for this session */
    }
  }, [items])

  // Keep two open tabs in step.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY) return
      try {
        setItems(sanitise(JSON.parse(e.newValue)))
      } catch {
        /* ignore malformed writes from another tab */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const ceiling = Math.min(MAX_QTY, Number(product.stock) || MAX_QTY)
      const existing = prev.find((i) => i.id === product.id)

      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: Math.min(ceiling, i.qty + qty) } : i
        )
      }

      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug ?? null,
          name: product.name,
          price: Number(product.price),
          image: product.images?.[0] ?? null,
          category: product.category,
          stock: Number(product.stock) || MAX_QTY,
          qty: Math.min(ceiling, Math.max(1, qty)),
        },
      ]
    })
  }, [])

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQty = useCallback((id, qty) => {
    setItems((prev) => {
      if (qty < 1) return prev.filter((i) => i.id !== id)
      return prev.map((i) =>
        i.id === id ? { ...i, qty: Math.min(Math.min(MAX_QTY, i.stock), qty) } : i
      )
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const count = items.reduce((sum, i) => sum + i.qty, 0)

    return {
      items,
      add,
      remove,
      updateQty,
      clear,
      count,
      /** Indicative only — the server recomputes this at checkout. */
      subtotal,
      /** The only shape the server is ever sent. */
      serverLines: () => items.map((i) => ({ product_id: i.id, quantity: i.qty })),
    }
  }, [items, add, remove, updateQty, clear])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
