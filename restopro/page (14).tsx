'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_FLOW = ['pendiente','cocina','listo','entregado']
const STATUS_LABEL: Record<string,string> = { pendiente:'Pendiente', cocina:'En cocina', listo:'Listo ✓', entregado:'Entregado' }
const STATUS_CLASS: Record<string,string> = { pendiente:'badge-warning', cocina:'badge-info', listo:'badge-success', entregado:'badge-gray' }

export default function PedidosPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [filter, setFilter] = useState('todos')
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function advance(id: string, status: string) {
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1]
    if (!next) return
    await supabase.from('orders').update({ status: next }).eq('id', id)
    load()
  }

  const filtered = filter === 'todos' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Pedidos</h1>
        <Link href="/nuevo-pedido" className="btn-primary">+ Nuevo pedido</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['todos','pendiente','cocina','listo','entregado'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === s ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(o => (
            <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">#{String(o.id).slice(0,6)}</span>
                <span className={`badge ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="text-xs text-gray-400 mb-2">🪑 {o.table_name}</div>
              <div className="text-xs text-gray-500 mb-3 leading-relaxed">
                {(o.items || []).map((item: string, i: number) => <div key={i}>{item}</div>)}
              </div>
              {o.note && <div className="text-xs text-gray-400 italic mb-3">"{o.note}"</div>}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">${o.total}</span>
                {o.status !== 'entregado' && (
                  <button onClick={() => advance(o.id, o.status)} className="btn-ghost text-xs">
                    Avanzar →
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-3 text-sm text-gray-400 text-center py-8">No hay pedidos en esta categoría.</p>
          )}
        </div>
      )}
    </div>
  )
}
