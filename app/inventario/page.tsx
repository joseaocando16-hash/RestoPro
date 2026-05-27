'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

interface InventoryItem {
  id: string
  name: string
  category: string
  stock: number
  min_stock: number
  restaurant_id: string
}

export default function InventarioPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<InventoryItem>>({})
  const [form, setForm] = useState({ name: '', category: 'Carne', stock: '', min_stock: '' })
  const [filterCat, setFilterCat] = useState('Todos')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!p) return
    setRestaurantId(p.restaurant_id)
    const { data } = await supabase.from('inventory').select('*').eq('restaurant_id', p.restaurant_id).order('name')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    if (!form.name || !form.stock) return
    await supabase.from('inventory').insert({
      name: form.name, category: form.category,
      stock: Number(form.stock), min_stock: Number(form.min_stock || 0),
      restaurant_id: restaurantId,
    })
    setForm({ name: '', category: 'Carne', stock: '', min_stock: '' })
    load()
  }

  async function deleteItem(id: string) {
    await supabase.from('inventory').delete().eq('id', id)
    load()
  }

  async function saveEdit(id: string) {
    await supabase.from('inventory').update(editData).eq('id', id)
    setEditing(null)
    load()
  }

  async function updateStock(id: string, delta: number, current: number) {
    await supabase.from('inventory').update({ stock: Math.max(0, current + delta) }).eq('id', id)
    load()
  }

  const cats = ['Todos', ...Array.from(new Set(items.map(i => i.category)))]
  const filtered = filterCat === 'Todos' ? items : items.filter(i => i.category === filterCat)
  const low = items.filter(i => i.stock < i.min_stock).length
  const outOf = items.filter(i => i.stock === 0).length

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">Inventario</h1>
          <div className="flex gap-2">
            {outOf > 0 && <span className="badge badge-danger">{outOf} sin stock</span>}
            {low > 0 && <span className="badge badge-warning">{low} bajo mínimo</span>}
          </div>
        </div>

        {/* Resumen visual */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="metric-card text-center">
            <div className="text-2xl font-bold text-gray-900">{items.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total productos</div>
          </div>
          <div className="metric-card text-center">
            <div className={`text-2xl font-bold ${low > 0 ? 'text-amber-500' : 'text-green-500'}`}>{low}</div>
            <div className="text-xs text-gray-500 mt-1">Stock bajo</div>
          </div>
          <div className="metric-card text-center">
            <div className={`text-2xl font-bold ${outOf > 0 ? 'text-red-500' : 'text-green-500'}`}>{outOf}</div>
            <div className="text-xs text-gray-500 mt-1">Sin stock</div>
          </div>
        </div>

        {/* Agregar producto */}
        <div className="card mb-4">
          <div className="text-sm font-medium text-gray-800 mb-3">+ Agregar producto</div>
          <div className="grid grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ej: Carne de res"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {['Carne','Verdura','Lácteo','Bebida','Mariscos','Otro'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Stock actual</label>
              <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mínimo requerido</label>
              <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})}
                placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <button onClick={addItem} className="btn-primary py-2">+ Agregar</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {cats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterCat === cat ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="card">
          {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
            <div className="space-y-2">
              {filtered.map(item => {
                const pct = Math.min(100, Math.round((item.stock / Math.max(item.min_stock * 1.5, 1)) * 100))
                const status = item.stock === 0 ? 'danger' : item.stock < item.min_stock ? 'warning' : 'success'
                const statusColor = { danger: '#E24B4A', warning: '#EF9F27', success: '#1D9E75' }[status]
                const statusLabel = { danger: 'Sin stock', warning: 'Bajo', success: 'Ok' }[status]
                const statusBadge = { danger: 'badge-danger', warning: 'badge-warning', success: 'badge-success' }[status]
                const isEditing = editing === item.id

                return (
                  <div key={item.id} className={`rounded-xl border p-4 transition-all ${isEditing ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                    {isEditing ? (
                      <div className="grid grid-cols-5 gap-3 items-center">
                        <input value={editData.name ?? item.name} onChange={e => setEditData({...editData, name: e.target.value})}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm col-span-1"/>
                        <select value={editData.category ?? item.category} onChange={e => setEditData({...editData, category: e.target.value})}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                          {['Carne','Verdura','Lácteo','Bebida','Mariscos','Otro'].map(c => <option key={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                          <input type="number" value={editData.stock ?? item.stock} onChange={e => setEditData({...editData, stock: Number(e.target.value)})}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"/>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" value={editData.min_stock ?? item.min_stock} onChange={e => setEditData({...editData, min_stock: Number(e.target.value)})}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"/>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(item.id)} className="btn-primary text-xs px-3 py-1.5 flex-1">Guardar</button>
                          <button onClick={() => setEditing(null)} className="btn-ghost text-xs px-3 py-1.5">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-800">{item.name}</span>
                            <span className="badge badge-gray text-xs">{item.category}</span>
                            <span className={`badge ${statusBadge} text-xs`}>{statusLabel}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">Stock: <strong className="text-gray-800">{item.stock}</strong></span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-500">Mínimo: <strong className="text-gray-800">{item.min_stock}</strong></span>
                            <div className="flex-1 max-w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-2 rounded-full transition-all" style={{width:`${pct}%`, background: statusColor}}></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateStock(item.id, -5, item.stock)} className="btn-ghost px-2 py-1 text-xs">-5</button>
                          <button onClick={() => updateStock(item.id, -1, item.stock)} className="btn-ghost px-2 py-1 text-xs">-1</button>
                          <button onClick={() => updateStock(item.id, 1, item.stock)} className="btn-ghost px-2 py-1 text-xs">+1</button>
                          <button onClick={() => updateStock(item.id, 5, item.stock)} className="btn-ghost px-2 py-1 text-xs">+5</button>
                          <button onClick={() => updateStock(item.id, 10, item.stock)} className="btn-ghost px-2 py-1 text-xs">+10</button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(item.id); setEditData({}) }} className="btn-ghost text-xs px-3 py-1.5">✏️ Editar</button>
                          <button onClick={() => deleteItem(item.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No hay productos en esta categoría.</p>}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
