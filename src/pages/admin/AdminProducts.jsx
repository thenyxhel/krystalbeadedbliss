import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { fmt, cap } from '../../lib/utils'
import { useToast, ToastContainer } from '../../components/Toast'

const CATS = ['bracelet', 'necklace', 'earrings', 'anklet', 'set']

const EMPTY = { name: '', category: 'bracelet', description: '', price: '', available: true, featured: false, images: [] }

export default function AdminProducts() {
  const { toasts, toast } = useToast()
  const fileRef = useRef()

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'add' | product object
  const [form, setForm]         = useState(EMPTY)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [filterCat, setFilter]  = useState('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (p) => { setForm({ ...p, price: String(p.price) }); setModal(p) }
  const closeModal = () => { setModal(null); setForm(EMPTY) }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Upload one or more images
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    const urls = []
    for (const file of files) {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const { error } = await supabase.storage.from('product-images').upload(path, file)
      if (error) { toast('Upload failed: ' + error.message, 'error'); continue }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    set('images', [...form.images, ...urls])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeImage = (url) => set('images', form.images.filter(i => i !== url))

  const handleSave = async () => {
    if (!form.name || !form.price) return toast('Name and price are required.', 'error')
    setSaving(true)
    const payload = { ...form, price: parseInt(form.price, 10) }

    let error
    if (modal === 'add') {
      ;({ error } = await supabase.from('products').insert(payload))
    } else {
      ;({ error } = await supabase.from('products').update(payload).eq('id', modal.id))
    }

    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast(modal === 'add' ? 'Product added!' : 'Product updated!')
    closeModal(); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Product deleted.'); load() }
  }

  const toggleAvail = async (p) => {
    await supabase.from('products').update({ available: !p.available }).eq('id', p.id)
    load()
  }

  const filtered = filterCat === 'all' ? products : products.filter(p => p.category === filterCat)

  return (
    <div>
      <ToastContainer toasts={toasts} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-eyebrow">Inventory</p>
          <h1 className="section-title">Products</h1>
        </div>
        <button className="btn-gold" onClick={openAdd}>+ Add Product</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', ...CATS].map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filterCat === c ? 'var(--gold)' : 'var(--surf)',
              color:      filterCat === c ? 'white'       : 'var(--tx2)',
              border: '1px solid var(--bd)',
            }}
          >
            {c === 'all' ? 'All' : cap(c) + 's'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm" style={{ color: 'var(--tx2)' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: 'var(--tx2)' }}>No products yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                {['Product', 'Category', 'Price', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tx2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                  {/* Product */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ width: 40, height: 40, background: 'var(--surf2)' }}
                      >
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                          : <span style={{ fontSize: 18 }}>📿</span>
                        }
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--tx)' }}>{p.name}</p>
                        {p.featured && <span className="text-xs" style={{ color: 'var(--gold)' }}>★ Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-xs" style={{ color: 'var(--tx2)' }}>{p.category}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: 'var(--tx)' }}>{fmt(p.price)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleAvail(p)}
                      className="text-xs font-bold px-2 py-1 rounded-full text-white"
                      style={{ background: p.available ? 'var(--gold)' : 'var(--pink)' }}
                    >
                      {p.available ? 'Live' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(204,31,110,0.1)', color: 'var(--pink)', border: 'none' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: 'var(--surf)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base" style={{ color: 'var(--tx)' }}>
                {modal === 'add' ? 'Add Product' : 'Edit Product'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--tx2)' }}>✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="Product name" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATS.map(c => <option key={c} value={c}>{cap(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Price (₦)</label>
                  <input className="input" type="number" placeholder="8500" value={form.price} onChange={e => set('price', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={3} placeholder="Brief description…" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                {[
                  { key: 'available', label: 'Available for sale' },
                  { key: 'featured',  label: 'Featured on home page' },
                ].map(t => (
                  <label key={t.key} className="flex items-center gap-2 text-sm" style={{ color: 'var(--tx)' }}>
                    <input
                      type="checkbox"
                      checked={form[t.key]}
                      onChange={e => set(t.key, e.target.checked)}
                      className="rounded"
                    />
                    {t.label}
                  </label>
                ))}
              </div>

              {/* Images */}
              <div>
                <label className="label">Images</label>
                {form.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {form.images.map(url => (
                      <div key={url} className="relative">
                        <img src={url} alt="" className="rounded-lg object-cover" style={{ width: 64, height: 64 }} />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute -top-1.5 -right-1.5 rounded-full text-white text-xs w-5 h-5 flex items-center justify-center"
                          style={{ background: 'var(--pink)', border: 'none' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label
                  className="flex items-center justify-center gap-2 rounded-xl py-5 transition-colors"
                  style={{ border: '2px dashed var(--bd)', background: 'var(--surf2)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--tx2)' }}>
                    {uploading ? 'Uploading…' : '+ Upload images'}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="flex gap-2 mt-2">
                <button className="btn-outline flex-1" onClick={closeModal}>Cancel</button>
                <button className="btn-gold flex-1" onClick={handleSave} disabled={saving || uploading}>
                  {saving ? 'Saving…' : modal === 'add' ? 'Add Product' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
