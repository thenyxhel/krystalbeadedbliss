import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../lib/utils'
import { useToast, ToastContainer } from '../../components/Toast'

export default function AdminCustomConfig() {
  const { toasts, toast } = useToast()
  const [config, setConfig] = useState(null)
  const [id, setId]         = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab]       = useState('beads') // beads | colors | charms | prices

  useEffect(() => {
    supabase.from('custom_config').select('*').limit(1).single()
      .then(({ data }) => { if (data) { setConfig(data); setId(data.id) } })
  }, [])

  const save = async (patch) => {
    setSaving(true)
    const merged = { ...config, ...patch }
    const { error } = id
      ? await supabase.from('custom_config').update(patch).eq('id', id)
      : await supabase.from('custom_config').insert(merged).select().single().then(({ data, error }) => {
          if (data) setId(data.id)
          return { error }
        })
    setSaving(false)
    if (error) toast(error.message, 'error')
    else { setConfig(merged); toast('Saved!') }
  }

  if (!config) {
    return (
      <div className="min-h-48 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--tx2)' }}>Loading config…</p>
      </div>
    )
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />

      <div className="mb-8">
        <p className="section-eyebrow">Custom Builder</p>
        <h1 className="section-title">Builder Config</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[['beads', 'Bead Types'], ['colors', 'Colours'], ['charms', 'Charms'], ['prices', 'Base Prices']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: tab === key ? 'var(--gold)' : 'var(--surf)',
              color:      tab === key ? 'white'       : 'var(--tx2)',
              border: '1px solid var(--bd)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bead Types */}
      {tab === 'beads' && (
        <BeadEditor
          items={config.bead_types || []}
          onSave={items => save({ bead_types: items })}
          saving={saving}
        />
      )}

      {/* Colours */}
      {tab === 'colors' && (
        <ColorEditor
          items={config.colors || []}
          onSave={items => save({ colors: items })}
          saving={saving}
        />
      )}

      {/* Charms */}
      {tab === 'charms' && (
        <CharmEditor
          items={config.charm_types || []}
          onSave={items => save({ charm_types: items })}
          saving={saving}
        />
      )}

      {/* Base Prices */}
      {tab === 'prices' && (
        <PriceEditor
          prices={config.base_prices || {}}
          onSave={prices => save({ base_prices: prices })}
          saving={saving}
        />
      )}
    </div>
  )
}

/* ── Bead Types ───────────────────────────────────────────── */
function BeadEditor({ items, onSave, saving }) {
  const [list, setList] = useState(items)
  const add = () => setList(l => [...l, { name: '', description: '', price_modifier: 0 }])
  const del = (i) => setList(l => l.filter((_, j) => j !== i))
  const set = (i, k, v) => setList(l => l.map((x, j) => j === i ? { ...x, [k]: v } : x))

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-3 mb-5">
        {list.map((b, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start">
            <input className="input col-span-3" placeholder="Name" value={b.name} onChange={e => set(i, 'name', e.target.value)} />
            <input className="input col-span-5" placeholder="Description" value={b.description} onChange={e => set(i, 'description', e.target.value)} />
            <input className="input col-span-3" type="number" placeholder="Extra ₦" value={b.price_modifier} onChange={e => set(i, 'price_modifier', parseInt(e.target.value) || 0)} />
            <button onClick={() => del(i)} style={{ background: 'none', border: 'none', color: 'var(--pink)', fontSize: 18, padding: 4 }}>✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-outline flex-1" onClick={add}>+ Add Bead Type</button>
        <button className="btn-gold flex-1" onClick={() => onSave(list)} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ── Colours ──────────────────────────────────────────────── */
function ColorEditor({ items, onSave, saving }) {
  const [list, setList] = useState(items)
  const add = () => setList(l => [...l, { name: '', hex: '#D4A830' }])
  const del = (i) => setList(l => l.filter((_, j) => j !== i))
  const set = (i, k, v) => setList(l => l.map((x, j) => j === i ? { ...x, [k]: v } : x))

  return (
    <div className="card p-6">
      <div className="flex flex-wrap gap-3 mb-5">
        {list.map((c, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--surf2)' }}>
            <input type="color" value={c.hex.startsWith('#') ? c.hex : '#D4A830'} onChange={e => set(i, 'hex', e.target.value)}
              style={{ width: 32, height: 32, border: 'none', borderRadius: '50%', padding: 0, background: 'none' }} />
            <input className="input text-xs" style={{ width: 100 }} placeholder="Name" value={c.name} onChange={e => set(i, 'name', e.target.value)} />
            <button onClick={() => del(i)} style={{ background: 'none', border: 'none', color: 'var(--pink)', fontSize: 16 }}>✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-outline flex-1" onClick={add}>+ Add Colour</button>
        <button className="btn-gold flex-1" onClick={() => onSave(list)} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ── Charms ───────────────────────────────────────────────── */
function CharmEditor({ items, onSave, saving }) {
  const [list, setList] = useState(items)
  const add = () => setList(l => [...l, { name: '', price: 500 }])
  const del = (i) => setList(l => l.filter((_, j) => j !== i))
  const set = (i, k, v) => setList(l => l.map((x, j) => j === i ? { ...x, [k]: v } : x))

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-3 mb-5">
        {list.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="input flex-1" placeholder="Charm name" value={c.name} onChange={e => set(i, 'name', e.target.value)} />
            <input className="input w-36" type="number" placeholder="Price ₦" value={c.price} onChange={e => set(i, 'price', parseInt(e.target.value) || 0)} />
            <button onClick={() => del(i)} style={{ background: 'none', border: 'none', color: 'var(--pink)', fontSize: 18, flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-outline flex-1" onClick={add}>+ Add Charm</button>
        <button className="btn-gold flex-1" onClick={() => onSave(list)} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ── Base Prices ──────────────────────────────────────────── */
function PriceEditor({ prices, onSave, saving }) {
  const [vals, setVals] = useState(prices)
  const set = (k, v) => setVals(p => ({ ...p, [k]: parseInt(v) || 0 }))

  return (
    <div className="card p-6 max-w-sm">
      <p className="text-sm mb-4" style={{ color: 'var(--tx2)' }}>
        Base price before bead type or charm additions.
      </p>
      <div className="flex flex-col gap-3 mb-5">
        {['bracelet', 'necklace', 'earrings'].map(p => (
          <div key={p}>
            <label className="label capitalize">{p}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--tx2)' }}>₦</span>
              <input
                className="input pl-8"
                type="number"
                value={vals[p] || 0}
                onChange={e => set(p, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="btn-gold w-full" onClick={() => onSave(vals)} disabled={saving}>
        {saving ? 'Saving…' : 'Save Prices'}
      </button>
    </div>
  )
}
