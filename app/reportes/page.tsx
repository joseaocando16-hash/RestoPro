'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#1D9E75','#378ADD','#EF9F27','#D4537E','#7F77DD','#E24B4A','#85C1E9']
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
type DateRange = 'today' | 'week' | 'month'

interface Category { name: string; value: number; visible: boolean; color: string }

export default function ReportesPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('week')
  const [visibleCharts, setVisibleCharts] = useState({ weekly: true, category: true, trend: true })
  const [categories, setCategories] = useState<Category[]>([
    { name: 'Platos fuertes', value: 45, visible: true, color: '#1D9E75' },
    { name: 'Bebidas', value: 25, visible: true, color: '#378ADD' },
    { name: 'Entradas', value: 20, visible: true, color: '#EF9F27' },
    { name: 'Postres', value: 10, visible: true, color: '#D4537E' },
  ])
  const [editingCat, setEditingCat] = useState<number|null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatValue, setNewCatValue] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
      if (!p) return
      const { data: ord } = await supabase.from('orders').select('*').eq('restaurant_id', p.restaurant_id).order('created_at', { ascending: false })
      setOrders(ord || [])
      setLoading(false)
    }
    load()
  }, [])

  const filterOrders = () => {
    const now = new Date()
    return orders.filter(o => {
      const d = new Date(o.created_at)
      if (dateRange === 'today') return d.toDateString() === now.toDateString()
      if (dateRange === 'week') { const w = new Date(now); w.setDate(w.getDate()-7); return d >= w }
      if (dateRange === 'month') { const m = new Date(now); m.setMonth(m.getMonth()-1); return d >= m }
      return true
    })
  }

  const filtered = filterOrders()
  const totalSales = filtered.reduce((s, o) => s + (o.total || 0), 0)
  const avgTicket = filtered.length ? Math.round(totalSales / filtered.length) : 0
  const delivered = filtered.filter(o => o.status === 'entregado').length

  const weekData = DAYS.map((d, i) => ({
    day: d,
    ventas: filtered.filter(o => new Date(o.created_at).getDay() === i).reduce((s,o) => s+o.total, 0)
  }))

  const trendData = Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i))
    const dayOrders = filtered.filter(o => new Date(o.created_at).toDateString() === d.toDateString())
    return { dia: d.toLocaleDateString('es-MX', {weekday:'short'}), ventas: dayOrders.reduce((s,o) => s+o.total, 0), pedidos: dayOrders.length }
  })

  const visibleCats = categories.filter(c => c.visible)

  function addCategory() {
    if (!newCatName || !newCatValue) return
    const color = COLORS[categories.length % COLORS.length]
    setCategories([...categories, { name: newCatName, value: Number(newCatValue), visible: true, color }])
    setNewCatName('')
    setNewCatValue('')
    setShowAddCat(false)
  }

  function deleteCategory(i: number) {
    setCategories(categories.filter((_, j) => j !== i))
  }

  function updateCategory(i: number, field: string, value: any) {
    setCategories(categories.map((c, j) => j === i ? { ...c, [field]: value } : c))
  }

  function toggleCatVisible(i: number) {
    setCategories(categories.map((c, j) => j === i ? { ...c, visible: !c.visible } : c))
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">Reportes</h1>
          <div className="flex gap-2">
            {(['today','week','month'] as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${dateRange===r?'bg-brand-500 text-white border-brand-500':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {r==='today'?'Hoy':r==='week'?'Esta semana':'Este mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="metric-card">
            <div className="text-xs text-gray-500 mb-1">Total pedidos</div>
            <div className="text-2xl font-semibold text-gray-900">{filtered.length}</div>
            <div className="text-xs text-gray-400 mt-1">{delivered} entregados</div>
          </div>
          <div className="metric-card">
            <div className="text-xs text-gray-500 mb-1">Ventas totales</div>
            <div className="text-2xl font-semibold text-gray-900">${totalSales.toLocaleString('es-MX')}</div>
          </div>
          <div className="metric-card">
            <div className="text-xs text-gray-500 mb-1">Ticket promedio</div>
            <div className="text-2xl font-semibold text-gray-900">${avgTicket}</div>
          </div>
          <div className="metric-card">
            <div className="text-xs text-gray-500 mb-1">Tasa de entrega</div>
            <div className="text-2xl font-semibold text-gray-900">{filtered.length?Math.round(delivered/filtered.length*100):0}%</div>
          </div>
        </div>

        {/* Controles gráficas */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <span className="text-xs text-gray-500 self-center">Mostrar:</span>
          {[{key:'weekly',label:'Ventas por día'},{key:'trend',label:'Tendencia'},{key:'category',label:'Por categoría'}].map(c => (
            <button key={c.key} onClick={() => setVisibleCharts(prev => ({...prev, [c.key]: !prev[c.key as keyof typeof prev]}))}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${visibleCharts[c.key as keyof typeof visibleCharts]?'bg-brand-500 text-white border-brand-500':'border-gray-200 text-gray-400'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {visibleCharts.weekly && (
            <div className="card">
              <div className="text-sm font-medium text-gray-800 mb-4">Ventas por día</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
                  <Tooltip formatter={(v:any)=>[`$${v}`,'Ventas']}/>
                  <Bar dataKey="ventas" fill="#1D9E75" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {visibleCharts.trend && (
            <div className="card">
              <div className="text-sm font-medium text-gray-800 mb-4">Tendencia últimos 7 días</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="dia" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
                  <Tooltip/>
                  <Line type="monotone" dataKey="ventas" stroke="#1D9E75" strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="pedidos" stroke="#378ADD" strokeWidth={2} dot={{r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Categorías editables */}
        {visibleCharts.category && (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-800">Ventas por categoría</div>
              <button onClick={() => setShowAddCat(!showAddCat)} className="btn-primary text-xs px-3 py-1.5">
                + Nueva categoría
              </button>
            </div>

            {/* Formulario agregar */}
            {showAddCat && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                  <input value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                    placeholder="Ej: Postres" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div className="w-28">
                  <label className="text-xs text-gray-500 mb-1 block">% del total</label>
                  <input type="number" value={newCatValue} onChange={e=>setNewCatValue(e.target.value)}
                    placeholder="0-100" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <button onClick={addCategory} className="btn-primary text-sm px-4 py-2">Agregar</button>
                <button onClick={() => setShowAddCat(false)} className="btn-ghost text-sm px-3 py-2">✕</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Lista editable */}
              <div className="space-y-2">
                {categories.map((cat, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${cat.visible?'border-gray-100 bg-gray-50':'border-gray-100 bg-white opacity-50'}`}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background: cat.color}}></div>
                    {editingCat === i ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input value={cat.name} onChange={e=>updateCategory(i,'name',e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1"/>
                        <input type="number" value={cat.value} onChange={e=>updateCategory(i,'value',Number(e.target.value))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-16"/>
                        <span className="text-xs text-gray-400">%</span>
                        <button onClick={()=>setEditingCat(null)} className="text-xs text-brand-500">✓</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-700 flex-1">{cat.name}</span>
                        <span className="text-xs font-medium text-gray-500">{cat.value}%</span>
                        <button onClick={()=>toggleCatVisible(i)} className="text-xs text-gray-400 hover:text-gray-600">
                          {cat.visible ? '👁️' : '🚫'}
                        </button>
                        <button onClick={()=>setEditingCat(i)} className="text-xs text-gray-400 hover:text-brand-500">✏️</button>
                        <button onClick={()=>deleteCategory(i)} className="text-xs text-gray-400 hover:text-red-500">🗑️</button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Gráfica */}
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={visibleCats} dataKey="value" cx="50%" cy="50%" outerRadius={90}
                    label={({name,value})=>`${name} ${value}%`} labelLine={true}>
                    {visibleCats.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v:any)=>[`${v}%`]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-3">Historial de pedidos</div>
          {loading ? <p className="text-sm text-gray-400">Cargando...</p> : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay pedidos en este período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2">Mesa</th><th className="text-left pb-2">Items</th>
                <th className="text-left pb-2">Total</th><th className="text-left pb-2">Estado</th>
                <th className="text-left pb-2">Fecha</th>
              </tr></thead>
              <tbody>{filtered.slice(0,20).map(o=>(
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 font-medium">{o.table_name}</td>
                  <td className="py-2 text-gray-500 text-xs">{(o.items||[]).slice(0,2).join(', ')}{o.items?.length>2?'...':''}</td>
                  <td className="py-2 font-medium">${o.total}</td>
                  <td className="py-2"><span className={`badge ${o.status==='entregado'?'badge-success':o.status==='listo'?'badge-info':'badge-warning'}`}>{o.status}</span></td>
                  <td className="py-2 text-gray-400 text-xs">{new Date(o.created_at).toLocaleString('es-MX')}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
