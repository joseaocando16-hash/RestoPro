'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

export default function AlertasPage() {
  const supabase = createClient()
  const [inventory, setInventory] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLimit, setTimeLimit] = useState(15)
  const [now, setNow] = useState(new Date())

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!p) return
    const [{ data: inv }, { data: ord }] = await Promise.all([
      supabase.from('inventory').select('*').eq('restaurant_id', p.restaurant_id),
      supabase.from('orders').select('*').eq('restaurant_id', p.restaurant_id).neq('status', 'entregado').order('created_at', { ascending: true })
    ])
    setInventory(inv || [])
    setOrders(ord || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => { setNow(new Date()); load() }, 30000)
    return () => clearInterval(interval)
  }, [])

  function getMinutes(createdAt: string) {
    return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000)
  }

  const critical = inventory.filter(i => i.stock === 0)
  const low = inventory.filter(i => i.stock > 0 && i.stock < i.min_stock)
  const delayedOrders = orders.filter(o => getMinutes(o.created_at) >= timeLimit)
  const okOrders = orders.filter(o => getMinutes(o.created_at) < timeLimit)
  const totalAlerts = critical.length + delayedOrders.length

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">Alertas</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Tiempo límite:</span>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs">
              {[10,15,20,30].map(t => <option key={t} value={t}>{t} min</option>)}
            </select>
            {totalAlerts > 0 && <span className="badge badge-danger">{totalAlerts} críticas</span>}
          </div>
        </div>

        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              <div className="metric-card border-l-4 border-red-400">
                <div className="text-xs text-gray-500 mb-1">Sin stock</div>
                <div className={`text-2xl font-bold ${critical.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{critical.length}</div>
              </div>
              <div className="metric-card border-l-4 border-amber-400">
                <div className="text-xs text-gray-500 mb-1">Stock bajo</div>
                <div className={`text-2xl font-bold ${low.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{low.length}</div>
              </div>
              <div className="metric-card border-l-4 border-red-400">
                <div className="text-xs text-gray-500 mb-1">Pedidos demorados</div>
                <div className={`text-2xl font-bold ${delayedOrders.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{delayedOrders.length}</div>
              </div>
              <div className="metric-card border-l-4 border-green-400">
                <div className="text-xs text-gray-500 mb-1">Pedidos a tiempo</div>
                <div className="text-2xl font-bold text-green-600">{okOrders.length}</div>
              </div>
            </div>

            {/* Pedidos demorados */}
            {orders.length > 0 && (
              <div className="card mb-4">
                <div className="text-sm font-medium text-gray-800 mb-3">⏱️ Tiempo de pedidos activos</div>
                <div className="space-y-2">
                  {orders.map(o => {
                    const mins = getMinutes(o.created_at)
                    const isDelayed = mins >= timeLimit
                    const pct = Math.min(100, Math.round((mins / timeLimit) * 100))
                    const barColor = isDelayed ? '#E24B4A' : mins >= timeLimit * 0.7 ? '#EF9F27' : '#1D9E75'
                    return (
                      <div key={o.id} className={`rounded-xl p-3 border ${isDelayed ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">🪑 {o.table_name}</span>
                            <span className={`badge ${o.status==='pendiente'?'badge-warning':o.status==='cocina'?'badge-info':'badge-success'}`}>{o.status}</span>
                            {isDelayed && <span className="badge badge-danger">⚠️ Demorado</span>}
                          </div>
                          <span className={`text-sm font-bold ${isDelayed ? 'text-red-600' : 'text-gray-700'}`}>
                            {mins} min
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-2 rounded-full transition-all" style={{width:`${pct}%`, background: barColor}}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>0 min</span>
                          <span>Límite: {timeLimit} min</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Alertas de stock crítico */}
            {critical.length > 0 && (
              <div className="card border-l-4 border-red-400 mb-4">
                <div className="text-sm font-medium text-red-700 mb-3">🚨 Sin stock — acción inmediata</div>
                {critical.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <span className="badge badge-gray">{item.category}</span>
                    </div>
                    <span className="badge badge-danger">0 unidades</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stock bajo */}
            {low.length > 0 && (
              <div className="card border-l-4 border-amber-400 mb-4">
                <div className="text-sm font-medium text-amber-700 mb-3">⚠️ Stock bajo — reponer pronto</div>
                {low.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <span className="badge badge-gray">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="badge badge-warning">{item.stock} unidades</span>
                      <div className="text-xs text-gray-400 mt-0.5">mínimo: {item.min_stock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Todo ok */}
            {critical.length === 0 && low.length === 0 && delayedOrders.length === 0 && (
              <div className="card text-center py-10">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-sm font-medium text-gray-700">Todo en orden</div>
                <div className="text-xs text-gray-400 mt-1">No hay alertas activas en este momento</div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
