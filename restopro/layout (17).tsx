'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

export default function CocinaPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string>('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!p) return
    setRestaurantId(p.restaurant_id)
    const { data: ord } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', p.restaurant_id)
      .in('status', ['pendiente', 'cocina'])
      .order('created_at', { ascending: true })
    setOrders(ord || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [])

  async function startOrder(id: string) {
    await supabase.from('orders').update({ status: 'cocina' }).eq('id', id)
    load()
  }

  async function readyOrder(id: string) {
    await supabase.from('orders').update({ status: 'listo' }).eq('id', id)
    load()
  }

  const pending = orders.filter(o => o.status === 'pendiente')
  const cooking = orders.filter(o => o.status === 'cocina')

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">👨‍🍳 Pantalla de cocina</h1>
          <span className="text-xs text-gray-400">Auto-actualiza cada 8 seg</span>
        </div>

        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <div className="grid grid-cols-2 gap-6">
            {/* Pendientes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <h2 className="text-sm font-medium text-gray-700">Nuevos pedidos ({pending.length})</h2>
              </div>
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <div className="card text-center py-8 text-sm text-gray-400">Sin pedidos nuevos</div>
                ) : pending.map(o => (
                  <div key={o.id} className="bg-white border-2 border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">🪑 {o.table_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(o.created_at).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {(o.items || []).map((item: string, i: number) => (
                        <div key={i} className="text-sm text-gray-700 font-medium">• {item}</div>
                      ))}
                    </div>
                    {o.note && <div className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-1 mb-3">📝 {o.note}</div>}
                    <button onClick={() => startOrder(o.id)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                      Comenzar a preparar 🔥
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* En preparación */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <h2 className="text-sm font-medium text-gray-700">En preparación ({cooking.length})</h2>
              </div>
              <div className="space-y-3">
                {cooking.length === 0 ? (
                  <div className="card text-center py-8 text-sm text-gray-400">Nada en preparación</div>
                ) : cooking.map(o => (
                  <div key={o.id} className="bg-white border-2 border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">🪑 {o.table_name}</span>
                      <span className="badge badge-info">Preparando</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {(o.items || []).map((item: string, i: number) => (
                        <div key={i} className="text-sm text-gray-700 font-medium">• {item}</div>
                      ))}
                    </div>
                    {o.note && <div className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 mb-3">📝 {o.note}</div>}
                    <button onClick={() => readyOrder(o.id)}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                      ✓ Marcar como listo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
