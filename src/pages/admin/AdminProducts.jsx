import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONFIG, categoryLabel, styleLabel } from '../../lib/config'
import { fmt, friendlyError, slugify } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import Icon from '../../components/Icon'

const EMPTY = {
  name: '',
  category: 'bracelet',
  style: 'beaded',
  description: '',
  price: '',
  stock: '1',
  available: true,
  featured: false,
  images: [],
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export default function AdminProducts() {
  const { toast } = useToast()
  const fileRef = useRef(null)
  const dialogRef = useRef(null)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | product
  const [form, setForm] = useState(EMPTY)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) toast(friendlyError(error, 'Could not load products.'), 'bad')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape closes the editor. It previously trapped you until you found the ✕.
  useEffect(() => {
    if (!editing) return
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    dialogRef.current?.querySelector('input, select, textarea')?.focus()
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const close = () => {
    setEditing(null)
    setForm(EMPTY)
  }

  const openNew = () => {
    setForm(EMPTY)
    setEditing('new')
  }

  const openEdit = (product) => {
    setForm({
      ...product,
      price: String(product.price ?? ''),
      stock: String(product.stock ?? 0),
      description: product.description ?? '',
      style: product.style ?? 'beaded',
      images: product.images ?? [],
    })
    setEditing(product)
  }

  const uploadImages = async (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    const uploaded = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name} is not an image.`, 'bad')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast(`${file.name} is over 5MB.`, 'bad')
        continue
      }

      const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { contentType: file.type })

      if (error) {
        toast(friendlyError(error, `Could not upload ${file.name}.`), 'bad')
        continue
      }
      uploaded.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
    }

    // Functional update: the previous version read `form.images` from a stale
    // closure, so uploading twice in quick succession dropped the first batch.
    setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }))
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (uploaded.length) toast(`${uploaded.length} image(s) added.`)
  }

  const save = async () => {
    const price = Number.parseInt(form.price, 10)
    const stock = Number.parseInt(form.stock, 10)

    if (!form.name.trim()) return toast('A name is required.', 'bad')
    if (!Number.isFinite(price) || price < 0) return toast('Enter a valid price.', 'bad')
    if (!Number.isFinite(stock) || stock < 0) return toast('Enter a valid stock count.', 'bad')

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      style: form.style,
      description: form.description.trim() || null,
      price,
      stock,
      available: form.available,
      featured: form.featured,
      images: form.images,
    }

    let error
    if (editing === 'new') {
      // Readable URLs: /product/rose-quartz-bracelet rather than a raw uuid.
      payload.slug = `${slugify(payload.name)}-${Math.random().toString(36).slice(2, 8)}`
      ;({ error } = await supabase.from('products').insert(payload))
    } else {
      ;({ error } = await supabase.from('products').update(payload).eq('id', editing.id))
    }

    setSaving(false)
    if (error) {
      toast(friendlyError(error, 'Could not save.'), 'bad')
      return
    }

    toast(editing === 'new' ? 'Product added.' : 'Product updated.')
    close()
    load()
  }

  const remove = async (product) => {
    if (!confirm(`Delete “${product.name}”? Its reviews go with it. This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) toast(friendlyError(error, 'Could not delete.'), 'bad')
    else {
      toast('Product deleted.')
      load()
    }
  }

  const toggleField = async (product, field) => {
    const { error } = await supabase
      .from('products')
      .update({ [field]: !product[field] })
      .eq('id', product.id)
    if (error) toast(friendlyError(error), 'bad')
    else load()
  }

  const visible = filter === 'all' ? products : products.filter((p) => p.category === filter)

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <p className="eyebrow mb-2">Inventory</p>
          <h1 className="h1">Products</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Icon name="plus" size={16} />
          Add product
        </button>
      </header>

      <div className="flex gap-2 flex-wrap mb-6" role="group" aria-label="Filter by category">
        <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All ({products.length})
        </button>
        {CONFIG.categories.map((c) => (
          <button key={c.key} type="button" className="chip" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-ink-3">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-ink-3">No products in this category yet.</p>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Product', 'Category', 'Price', 'Stock', 'Listed', 'Featured', ''].map((h, i) => (
                  <th key={i} scope="col" className="eyebrow text-left px-4 py-3" style={{ fontSize: '0.625rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < visible.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="frame frame-square flex-shrink-0" style={{ width: 40 }}>
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" loading="lazy" width="80" height="80" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-ink-3">
                            <Icon name="image" size={16} />
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {categoryLabel(p.category)}
                    <span className="block meta">{styleLabel(p.style)}</span>
                  </td>
                  <td className="px-4 py-3 numeric font-semibold">{fmt(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`numeric ${p.stock === 0 ? 'font-semibold' : ''}`} style={{ color: p.stock === 0 ? 'var(--bad)' : p.stock <= 3 ? 'var(--warn)' : 'var(--ink)' }}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className={`badge ${p.available ? 'badge-ok' : 'badge-muted'}`}
                      onClick={() => toggleField(p, 'available')}
                      style={{ border: 'none', cursor: 'pointer' }}
                      aria-pressed={p.available}
                    >
                      {p.available ? 'Live' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleField(p, 'featured')}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 4 }}
                      aria-pressed={p.featured}
                      aria-label={p.featured ? `Unfeature ${p.name}` : `Feature ${p.name}`}
                    >
                      <Icon
                        name="star"
                        size={17}
                        style={{ color: 'var(--gold)', fill: p.featured ? 'var(--gold)' : 'none' }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--bad)' }}
                        onClick={() => remove(p)}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Editor ────────────────────────────────────────────────────────── */}
      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-editor-title"
            className="card w-full animate-rise"
            style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4 sticky top-0"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
            >
              <h2 className="h3" id="product-editor-title">
                {editing === 'new' ? 'Add product' : 'Edit product'}
              </h2>
              <button type="button" onClick={close} className="btn btn-ghost btn-sm" style={{ padding: 6 }} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="label" htmlFor="p-name">
                  Name
                </label>
                <input id="p-name" className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label" htmlFor="p-category">
                    Category
                  </label>
                  <select id="p-category" className="field" value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {CONFIG.categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.singular}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="p-style">
                    Made of
                  </label>
                  <select id="p-style" className="field" value={form.style} onChange={(e) => set('style', e.target.value)}>
                    {CONFIG.styles.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="p-price">
                    Price (₦)
                  </label>
                  <input
                    id="p-price"
                    className="field numeric"
                    type="number"
                    min="0"
                    step="100"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="p-stock">
                    Stock
                  </label>
                  <input
                    id="p-stock"
                    className="field numeric"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => set('stock', e.target.value)}
                  />
                </div>
              </div>

              <p className="help" style={{ marginTop: '-0.75rem' }}>
                Stock is decremented automatically when an order is placed, and the piece
                stops being sellable at zero.
              </p>

              <div>
                <label className="label" htmlFor="p-description">
                  Description
                </label>
                <textarea
                  id="p-description"
                  className="field"
                  rows={3}
                  maxLength={2000}
                  style={{ resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.available} onChange={(e) => set('available', e.target.checked)} />
                  Listed in the shop
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                  Featured on the home page
                </label>
              </div>

              <div>
                <span className="label">Images</span>
                {form.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {form.images.map((url, index) => (
                      <div key={url} className="relative">
                        <img
                          src={url}
                          alt={`Product image ${index + 1}`}
                          width="72"
                          height="72"
                          style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--r-md)' }}
                        />
                        <button
                          type="button"
                          onClick={() => set('images', form.images.filter((i) => i !== url))}
                          className="absolute flex items-center justify-center"
                          style={{
                            top: -6,
                            right: -6,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'var(--bad)',
                            color: '#fff',
                            border: 'none',
                          }}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <Icon name="close" size={12} />
                        </button>
                        {index === 0 && (
                          <span className="badge badge-muted absolute" style={{ bottom: 4, left: 4, fontSize: '0.5625rem' }}>
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <label
                  className="flex items-center justify-center gap-2 py-5 cursor-pointer"
                  style={{ border: '1.5px dashed var(--line-strong)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}
                >
                  <Icon name={uploading ? 'spinner' : 'upload'} size={17} className={uploading ? 'animate-spin' : ''} />
                  <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Add images'}</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="sr-only"
                    onChange={uploadImages}
                    disabled={uploading}
                  />
                </label>
                <p className="help">The first image is used everywhere the piece is listed.</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={close}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary flex-1" onClick={save} disabled={saving || uploading}>
                  {saving ? 'Saving…' : editing === 'new' ? 'Add product' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
