'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

export default function MesasPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: ord } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', p.restaurant_id)
        .neq('status', 'entregado')
        .order('created_at', { ascending: false })
      setOrders(ord || [])
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const STATUS_CLASS: Record<string,string> = {
    pendiente: 'badge-warning', cocina: 'badge-info', listo: 'badge-success'
  }
  const STATUS_LABEL: Record<string,string> = {
    pendiente: 'Pendiente', cocina: 'En cocina', listo: '✓ Listo'
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Mis pedidos activos</h1>
            <p className="text-xs text-gray-400 mt-0.5">Se actualiza cada 10 segundos</p>
          </div>
          <Link href="/nuevo-pedido" className="btn-primary">+ Nuevo pedido</Link>
        </div>

        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <>
            {orders.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-3xl mb-3">🪑</div>
                <div className="text-sm text-gray-600 font-medium">No hay pedidos activos</div>
                <div className="text-xs text-gray-400 mt-1">Crea un nuevo pedido para comenzar</div>
                <Link href="/nuevo-pedido" className="btn-primary inline-block mt-4">+ Nuevo pedido</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {orders.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">🪑 {o.table_name}</span>
                      <span className={`badge ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {(o.items || []).map((item: string, i: number) => (
                        <div key={i} className="text-xs text-gray-600">{item}</div>
                      ))}
                    </div>
                    {o.note && <div className="text-xs text-gray-400 italic mb-2">"{o.note}"</div>}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <span className="text-sm font-bold text-gray-900">${o.total}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(o.created_at).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    {o.status === 'listo' && (
                      <div className="mt-2 bg-green-50 rounded-lg px-3 py-2 text-xs text-green-700 font-medium text-center">
                        ¡Listo para entregar! 🎉
                      </div>
                    )}
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
