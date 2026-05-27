'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AlertasPage() {
  const supabase = createClient()
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('inventory').select('*').then(({ data }) => {
      setInventory(data || [])
      setLoading(false)
    })
  }, [])

  const critical = inventory.filter(i => i.stock === 0)
  const low = inventory.filter(i => i.stock > 0 && i.stock < i.min_stock)
  const ok = inventory.filter(i => i.stock >= i.min_stock)

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">Alertas</h1>

      {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="metric-card border-l-4 border-red-400">
              <div className="text-xs text-gray-500 mb-1">Sin stock</div>
              <div className="text-2xl font-semibold text-red-600">{critical.length}</div>
            </div>
            <div className="metric-card border-l-4 border-amber-400">
              <div className="text-xs text-gray-500 mb-1">Stock bajo</div>
              <div className="text-2xl font-semibold text-amber-600">{low.length}</div>
            </div>
            <div className="metric-card border-l-4 border-green-400">
              <div className="text-xs text-gray-500 mb-1">Stock ok</div>
              <div className="text-2xl font-semibold text-green-600">{ok.length}</div>
            </div>
          </div>

          {critical.length > 0 && (
            <div className="card border-l-4 border-red-400 mb-4">
              <div className="text-sm font-medium text-red-700 mb-3">🚨 Sin stock — acción inmediata</div>
              {critical.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    <span className="badge badge-gray ml-2">{item.category}</span>
                  </div>
                  <span className="badge badge-danger">0 unidades</span>
                </div>
              ))}
            </div>
          )}

          {low.length > 0 && (
            <div className="card border-l-4 border-amber-400 mb-4">
              <div className="text-sm font-medium text-amber-700 mb-3">⚠️ Stock bajo — reponer pronto</div>
              {low.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    <span className="badge badge-gray ml-2">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-warning">{item.stock} unidades</span>
                    <div className="text-xs text-gray-400 mt-0.5">mínimo: {item.min_stock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {critical.length === 0 && low.length === 0 && (
            <div className="card text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm text-gray-600 font-medium">Todo el inventario está en niveles óptimos</div>
              <div className="text-xs text-gray-400 mt-1">No hay alertas activas en este momento</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
