import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import { useToast, ToastContainer } from '../components/Toast'
import { cap } from '../lib/utils'

const CATS = ['all', 'bracelet', 'necklace', 'earrings', 'anklet', 'set']

export default function ShopPage() {
  const [params, setParams] = useSearchParams()
  const { toasts, toast }   = useToast()

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const category = params.get('category') || 'all'

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('products').select('*').eq('available', true).order('created_at', { ascending: false })
    if (category !== 'all') q = q.eq('category', category)
    q.then(({ data }) => { setProducts(data || []); setLoading(false) })
  }, [category])

  const setCategory = (c) => {
    if (c === 'all') setParams({})
    else setParams({ category: c })
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="pt-4 pb-8">
        <p className="section-eyebrow">Everything in stock</p>
        <h1 className="section-title">Shop</h1>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2"
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="var(--tx2)" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className="input pl-11"
          placeholder="Search pieces…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATS.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
            style={{
              background: category === c ? 'var(--gold)' : 'var(--surf)',
              color:      category === c ? 'white'       : 'var(--tx2)',
              border:     '1px solid var(--bd)',
            }}
          >
            {c === 'all' ? 'All' : cap(c) + 's'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ height: 320, opacity: 0.4 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-serif text-2xl mb-2" style={{ color: 'var(--tx)' }}>Nothing here yet</p>
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>
            {search ? 'Try a different search term.' : 'Check back soon — new pieces drop regularly.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} onAdded={() => toast('Added to cart!')} />
          ))}
        </div>
      )}
    </div>
  )
}
