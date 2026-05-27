'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

export default function CajaPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!p) return
    const { data: ord } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', p.restaurant_id)
      .eq('status', 'listo')
      .order('created_at', { ascending: true })
    setOrders(ord || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [])

  async function closeOrder(id: string) {
    await supabase.from('orders').update({ status: 'entregado' }).eq('id', id)
    load()
  }

  const total = orders.reduce((s, o) => s + (o.total || 0), 0)

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">💳 Caja</h1>
          <div className="metric-card px-4">
            <span className="text-xs text-gray-500">Por cobrar: </span>
            <span className="text-sm font-bold text-gray-900">${total.toLocaleString('es-MX')}</span>
          </div>
        </div>

        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <>
            {orders.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-3xl mb-3">✅</div>
                <div className="text-sm text-gray-600 font-medium">No hay pedidos listos por cobrar</div>
                <div className="text-xs text-gray-400 mt-1">Los pedidos marcados como listos aparecerán aquí</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {orders.map(o => (
                  <div key={o.id} className="bg-white border-2 border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 text-lg">🪑 {o.table_name}</span>
                      <span className="badge badge-success">✓ Listo</span>
                    </div>
                    <div className="space-y-1 mb-4">
                      {(o.items || []).map((item: string, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item}</span>
                        </div>
                      ))}
                    </div>
                    {o.note && <div className="text-xs text-gray-400 italic mb-3">"{o.note}"</div>}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-xl font-bold text-gray-900">${o.total}</span>
                    </div>
                    <button onClick={() => closeOrder(o.id)}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-lg transition-colors">
                      💳 Cobrar y cerrar mesa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
