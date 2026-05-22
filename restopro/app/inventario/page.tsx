'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function InventarioPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name:'', category:'Carne', stock:'', min_stock:'' })

  async function load() {
    const { data } = await supabase.from('inventory').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addItem() {
    if (!form.name || !form.stock) return
    await supabase.from('inventory').insert({
      name: form.name,
      category: form.category,
      stock: Number(form.stock),
      min_stock: Number(form.min_stock || 0),
    })
    setForm({ name:'', category:'Carne', stock:'', min_stock:'' })
    load()
  }

  async function updateStock(id: string, delta: number, current: number) {
    const next = Math.max(0, current + delta)
    await supabase.from('inventory').update({ stock: next }).eq('id', id)
    load()
  }

  const low = items.filter(i => i.stock < i.min_stock).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Inventario</h1>
        {low > 0 && <span className="badge badge-danger">{low} producto{low>1?'s':''} bajo mínimo</span>}
      </div>

      {/* Add form */}
      <div className="card">
        <div className="text-sm font-medium text-gray-800 mb-3">Agregar producto</div>
        <div className="grid grid-cols-5 gap-3 items-end">
          <div><label className="text-xs text-gray-500 mb-1 block">Nombre</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej: Carne de res" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Categoría</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['Carne','Verdura','Lácteo','Bebida','Otro'].map(c=><option key={c}>{c}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Stock actual</label>
            <input type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Mínimo</label>
            <input type="number" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
          <button onClick={addItem} className="btn-primary py-2">+ Agregar</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-3">Producto</th>
              <th className="text-left pb-3">Categoría</th>
              <th className="text-left pb-3">Stock</th>
              <th className="text-left pb-3">Mínimo</th>
              <th className="text-left pb-3">Estado</th>
              <th className="text-left pb-3">Ajustar</th>
            </tr></thead>
            <tbody>{items.map(item => {
              const pct = Math.min(100, Math.round((item.stock / Math.max(item.min_stock * 2, 1)) * 100))
              const status = item.stock === 0 ? 'badge-danger' : item.stock < item.min_stock ? 'badge-warning' : 'badge-success'
              const statusTxt = item.stock === 0 ? 'Sin stock' : item.stock < item.min_stock ? 'Bajo' : 'Ok'
              const barColor = item.stock === 0 ? '#E24B4A' : item.stock < item.min_stock ? '#EF9F27' : '#1D9E75'
              return (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="py-3"><span className="badge badge-gray">{item.category}</span></td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span>{item.stock}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full" style={{width:`${pct}%`,background:barColor}}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-gray-500">{item.min_stock}</td>
                  <td className="py-3"><span className={`badge ${status}`}>{statusTxt}</span></td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button onClick={()=>updateStock(item.id,-1,item.stock)} className="btn-ghost px-2 py-1 text-xs">−</button>
                      <button onClick={()=>updateStock(item.id,1,item.stock)} className="btn-ghost px-2 py-1 text-xs">+</button>
                    </div>
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
