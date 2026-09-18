import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONFIG, categoryLabel } from '../../lib/config'
import { fmt, friendlyError } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import Icon from '../../components/Icon'

// Driven by the shared taxonomy, so adding a category in config.js gives it
// a base price field here automatically.
const PIECE_TYPES = CONFIG.categories.map((c) => c.key)

export default function AdminCustomConfig() {
  const { toast } = useToast()

  const [id, setId] = useState(null)
  const [beadTypes, setBeadTypes] = useState([])
  const [charmTypes, setCharmTypes] = useState([])
  const [colors, setColors] = useState([])
  const [basePrices, setBasePrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('custom_config')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast(friendlyError(error, 'Could not load the builder options.'), 'bad')
          setLoading(false)
          return
        }
        setId(data.id)
        setBeadTypes(data.bead_types ?? [])
        setCharmTypes(data.charm_types ?? [])
        setColors(data.colors ?? [])
        setBasePrices(data.base_prices ?? {})
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('custom_config')
      .update({
        bead_types: beadTypes.filter((b) => b.name?.trim()),
        charm_types: charmTypes.filter((c) => c.name?.trim()),
        colors: colors.filter((c) => c.name?.trim()),
        base_prices: basePrices,
      })
      .eq('id', id)
    setSaving(false)

    if (error) toast(friendlyError(error, 'Could not save.'), 'bad')
    else toast('Builder options saved.')
  }

  const patch = (setter, index, key, value) =>
    setter((list) => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)))

  const removeAt = (setter, index) => setter((list) => list.filter((_, i) => i !== index))

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton" style={{ height: 28, width: '40%' }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    )
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <p className="eyebrow mb-2">Custom builder</p>
          <h1 className="h1">Builder options</h1>
          <p className="text-sm text-ink-2 mt-2" style={{ maxWidth: '52ch' }}>
            These are the choices customers see — and the prices the server uses when it
            quotes a custom order. Changing a price here changes what is charged.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save all changes'}
        </button>
      </header>

      <div className="flex flex-col gap-6">
        {/* ── Base prices ─────────────────────────────────────────────────── */}
        <section className="card p-6">
          <h2 className="h3 mb-1">Starting price</h2>
          <p className="text-sm text-ink-2 mb-5">Before any bead or charm surcharges.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PIECE_TYPES.map((type) => (
              <div key={type}>
                <label className="label" htmlFor={`base-${type}`}>
                  {categoryLabel(type)}
                </label>
                <input
                  id={`base-${type}`}
                  type="number"
                  min="0"
                  step="100"
                  className="field numeric"
                  value={basePrices[type] ?? 0}
                  onChange={(e) =>
                    setBasePrices((p) => ({ ...p, [type]: Number.parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Bead types ──────────────────────────────────────────────────── */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="h3">Bead types</h2>
              <p className="text-sm text-ink-2 mt-1">The surcharge is added once per type chosen.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setBeadTypes((b) => [...b, { name: '', description: '', price_modifier: 0 }])}
            >
              <Icon name="plus" size={15} />
              Add
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {beadTypes.map((bead, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.6fr) 110px auto' }}>
                <input
                  className="field"
                  placeholder="Name"
                  aria-label={`Bead ${i + 1} name`}
                  value={bead.name ?? ''}
                  onChange={(e) => patch(setBeadTypes, i, 'name', e.target.value)}
                />
                <input
                  className="field"
                  placeholder="Short description"
                  aria-label={`Bead ${i + 1} description`}
                  value={bead.description ?? ''}
                  onChange={(e) => patch(setBeadTypes, i, 'description', e.target.value)}
                />
                <input
                  className="field numeric"
                  type="number"
                  min="0"
                  step="100"
                  aria-label={`Bead ${i + 1} surcharge`}
                  value={bead.price_modifier ?? 0}
                  onChange={(e) => patch(setBeadTypes, i, 'price_modifier', Number.parseInt(e.target.value, 10) || 0)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--bad)' }}
                  onClick={() => removeAt(setBeadTypes, i)}
                  aria-label={`Remove bead type ${bead.name || i + 1}`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            {beadTypes.length === 0 && <p className="text-sm text-ink-3">No bead types. Customers cannot build anything.</p>}
          </div>
        </section>

        {/* ── Charms ──────────────────────────────────────────────────────── */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="h3">Charms</h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setCharmTypes((c) => [...c, { name: '', price: 0 }])}>
              <Icon name="plus" size={15} />
              Add
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {charmTypes.map((charm, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) 110px auto' }}>
                <input
                  className="field"
                  placeholder="Name"
                  aria-label={`Charm ${i + 1} name`}
                  value={charm.name ?? ''}
                  onChange={(e) => patch(setCharmTypes, i, 'name', e.target.value)}
                />
                <input
                  className="field numeric"
                  type="number"
                  min="0"
                  step="100"
                  aria-label={`Charm ${i + 1} price`}
                  value={charm.price ?? 0}
                  onChange={(e) => patch(setCharmTypes, i, 'price', Number.parseInt(e.target.value, 10) || 0)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--bad)' }}
                  onClick={() => removeAt(setCharmTypes, i)}
                  aria-label={`Remove charm ${charm.name || i + 1}`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Colours ─────────────────────────────────────────────────────── */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="h3">Colours</h2>
              <p className="text-sm text-ink-2 mt-1">The swatch is what the customer sees — make it honest.</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setColors((c) => [...c, { name: '', hex: '#B4552F' }])}>
              <Icon name="plus" size={15} />
              Add
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {colors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="flex-shrink-0"
                  style={{ width: 34, height: 34, borderRadius: '50%', background: color.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' }}
                />
                <input
                  className="field"
                  placeholder="Name"
                  aria-label={`Colour ${i + 1} name`}
                  value={color.name ?? ''}
                  onChange={(e) => patch(setColors, i, 'name', e.target.value)}
                />
                <input
                  className="field"
                  style={{ width: 108 }}
                  placeholder="#B4552F"
                  aria-label={`Colour ${i + 1} hex`}
                  value={color.hex ?? ''}
                  onChange={(e) => patch(setColors, i, 'hex', e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--bad)' }}
                  onClick={() => removeAt(setColors, i)}
                  aria-label={`Remove colour ${color.name || i + 1}`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Preview of the arithmetic ─────────────────────────────────────── */}
      <section className="well p-5 mt-6">
        <p className="eyebrow mb-2">Worked example</p>
        <p className="text-sm text-ink-2">
          A bracelet with {beadTypes[0]?.name || 'the first bead type'} and{' '}
          {charmTypes[0]?.name || 'the first charm'} currently quotes at{' '}
          <span className="numeric font-semibold text-ink">
            {fmt(
              (Number(basePrices.bracelet ?? 0) +
                Number(beadTypes[0]?.price_modifier ?? 0) +
                Number(charmTypes[0]?.price ?? 0))
            )}
          </span>
          .
        </p>
      </section>

      <div className="flex justify-end mt-6">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save all changes'}
        </button>
      </div>
    </div>
  )
}
