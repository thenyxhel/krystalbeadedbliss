import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../lib/config'
import { useSeo } from '../lib/useSeo'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'
import { Mark } from '../components/Brand'

const PAGE_SIZE = 12

const SORTS = {
  newest: { label: 'Newest', column: 'created_at', ascending: false },
  'price-asc': { label: 'Price: low to high', column: 'price', ascending: true },
  'price-desc': { label: 'Price: high to low', column: 'price', ascending: false },
  name: { label: 'A–Z', column: 'name', ascending: true },
}

const COLUMNS = 'id, slug, name, category, description, price, stock, images, available, featured'

export default function ShopPage() {
  const [params, setParams] = useSearchParams()

  const category = params.get('category') ?? 'all'
  const sortKey = SORTS[params.get('sort')] ? params.get('sort') : 'newest'
  const queryParam = params.get('q') ?? ''

  const [searchInput, setSearchInput] = useState(queryParam)
  const [products, setProducts] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const requestId = useRef(0)

  const categoryLabel =
    category === 'all' ? 'Every piece' : CONFIG.categories.find((c) => c.key === category)?.label ?? 'Shop'

  useSeo({
    title: category === 'all' ? 'Shop' : categoryLabel,
    description: `${categoryLabel} — hand-strung bead jewellery from ${CONFIG.city}.`,
  })

  // Debounce the text input into the URL so the query is shareable and the
  // back button works, without firing a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput === queryParam) return
      const next = new URLSearchParams(params)
      if (searchInput) next.set('q', searchInput)
      else next.delete('q')
      setParams(next, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  /**
   * Filtering, searching, sorting and paging all happen in Postgres.
   * The old page pulled every row with select('*') and filtered the array in
   * the browser, so "search" only ever searched what had already downloaded —
   * and the payload grew with the catalogue forever.
   */
  const fetchPage = useCallback(
    async (from) => {
      const id = ++requestId.current
      const sort = SORTS[sortKey]

      let query = supabase
        .from('products')
        .select(COLUMNS, { count: 'exact' })
        .eq('available', true)
        .order(sort.column, { ascending: sort.ascending })
        .range(from, from + PAGE_SIZE - 1)

      if (category !== 'all') query = query.eq('category', category)
      if (queryParam) {
        const safe = queryParam.replace(/[%,()]/g, ' ').trim()
        if (safe) query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`)
      }

      const { data, error, count } = await query

      // A slower earlier request must not overwrite a newer one's results.
      if (id !== requestId.current) return null
      if (error) {
        console.error('[KBB] shop query:', error)
        return { error }
      }
      return { rows: data ?? [], count: count ?? 0 }
    },
    [category, sortKey, queryParam]
  )

  useEffect(() => {
    let cancelled = false
    setState('loading')

    fetchPage(0).then((result) => {
      if (cancelled || !result) return
      if (result.error) {
        setState('error')
        return
      }
      setProducts(result.rows)
      setTotal(result.count)
      setState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [fetchPage])

  const loadMore = async () => {
    setLoadingMore(true)
    const result = await fetchPage(products.length)
    if (result && !result.error) {
      setProducts((prev) => [...prev, ...result.rows])
      setTotal(result.count)
    }
    setLoadingMore(false)
  }

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const hasMore = products.length < total

  return (
    <div className="page py-10">
      <header className="mb-9">
        <p className="eyebrow mb-2">The collection</p>
        <h1 className="h1">{categoryLabel}</h1>
        {state === 'ready' && (
          <p className="meta mt-2 numeric" aria-live="polite">
            {total} {total === 1 ? 'piece' : 'pieces'}
            {queryParam && ` matching “${queryParam}”`}
          </p>
        )}
      </header>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-10">
        <div className="relative flex-1 lg:max-w-sm">
          <Icon
            name="search"
            size={17}
            className="absolute text-ink-3"
            style={{ left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <label className="sr-only" htmlFor="shop-search">
            Search pieces
          </label>
          <input
            id="shop-search"
            type="search"
            className="field"
            style={{ paddingLeft: 38 }}
            placeholder="Search by name or description"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="flex-1 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          <button
            type="button"
            className="chip"
            aria-pressed={category === 'all'}
            onClick={() => setParam('category', 'all', 'all')}
          >
            All
          </button>
          {CONFIG.categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className="chip"
              aria-pressed={category === c.key}
              onClick={() => setParam('category', c.key, 'all')}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="lg:ml-auto">
          <label className="sr-only" htmlFor="shop-sort">
            Sort
          </label>
          <select
            id="shop-sort"
            className="field"
            style={{ width: 'auto', minWidth: 170 }}
            value={sortKey}
            onChange={(e) => setParam('sort', e.target.value, 'newest')}
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {state === 'error' ? (
        // An empty grid used to be shown here too, which quietly told customers
        // the shop was empty when in fact the database was unreachable.
        <div className="well p-10 text-center">
          <Icon name="alert" size={26} className="mx-auto" style={{ color: 'var(--bad)' }} />
          <p className="h3 mt-3">We could not load the collection.</p>
          <p className="text-sm text-ink-2 mt-1.5">This is a problem on our side, not yours.</p>
          <button type="button" className="btn btn-outline btn-sm mt-5" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      ) : state === 'loading' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ aspectRatio: '4 / 5' }} />
              <div className="skeleton mt-3.5" style={{ height: 12, width: '40%' }} />
              <div className="skeleton mt-2" style={{ height: 18, width: '75%' }} />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="well p-12 text-center">
          <Mark size={42} className="mx-auto opacity-60" />
          <p className="h2 mt-5">
            {queryParam ? 'No piece matches that.' : 'Nothing here yet.'}
          </p>
          <p className="text-sm text-ink-2 mt-2">
            {queryParam
              ? 'Try a shorter word, or browse everything.'
              : 'New pieces are added regularly — or design one yourself.'}
          </p>
          <div className="flex gap-2 justify-center mt-6">
            {(queryParam || category !== 'all') && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearchInput(''); setParams({}) }}>
                Clear filters
              </button>
            )}
            <a href="/custom" className="btn btn-primary btn-sm no-underline">
              Design your own
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-14">
              <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Icon name="spinner" size={16} className="animate-spin" /> Loading
                  </>
                ) : (
                  `Show more (${total - products.length} left)`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
