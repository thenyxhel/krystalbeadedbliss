import { createContext, useContext, useEffect, useState } from 'react'

const CartCtx = createContext()

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kbb-cart')) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('kbb-cart', JSON.stringify(items))
  }, [items])

  const add = (product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id
          ? { ...i, qty: i.qty + qty }
          : i)
      }
      return [...prev, { ...product, qty }]
    })
  }

  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const updateQty = (id, qty) => {
    if (qty < 1) return remove(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const clear = () => setItems([])

  const total   = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count   = items.reduce((s, i) => s + i.qty, 0)

  return (
    <CartCtx.Provider value={{ items, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartCtx.Provider>
  )
}

export const useCart = () => useContext(CartCtx)
