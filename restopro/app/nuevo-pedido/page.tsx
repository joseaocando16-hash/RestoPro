'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MENU = [
  { name: 'Tacos al pastor', price: 85 },
  { name: 'Hamburguesa clásica', price: 145 },
  { name: 'Pizza personal', price: 130 },
  { name: 'Ensalada César', price: 95 },
  { name: 'Pasta alfredo', price: 165 },
  { name: 'Agua fresca', price: 35 },
  { name: 'Cerveza', price: 65 },
  { name: 'Refresco', price: 30 },
]

export default function NuevoPedidoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mesa, setMesa] = useState('Mesa 1')
  const [note, setNote] = useState('')
  const [qty, setQty] = useState<number[]>(MENU.map(() => 0))
  const [saving, setSaving] = useState(false)

  const changeQty = (i: number, d: number) => {
    const next = [...qty]
    next[i] = Math.max(0, next[i] + d)
    setQty(next)
  }

  const selected = MENU.filter((_, i) => qty[i] > 0)
  const total = MENU.reduce((s, m, i) => s + m.price * qty[i], 0)
  const items = MENU.filter((_, i) => qty[i] > 0).map((m, _, arr) => {
    const i = MENU.indexOf(m)
    return `${qty[i]}x ${m.name}`
  })

  async function handleSubmit() {
    if (!selected.length) return
    setSaving(true)
    await supabase.from('orders').insert({
      table_name: mesa,
      items,
      note,
      total,
      status: 'pendiente',
    })
    router.push('/pedidos')
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">Nuevo pedido</h1>
      <div className="grid grid-cols-2 gap-6">
        {/* Menú */}
        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-3">Menú</div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Mesa</label>
            <select value={mesa} onChange={e => setMesa(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {Array.from({length:12},(_,i)=>`Mesa ${i+1}`).map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          {MENU.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm text-gray-800">{item.name}</div>
                <div className="text-xs text-gray-400">${item.price}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => changeQty(i,-1)} className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-600">−</button>
                <span className="text-sm w-4 text-center text-gray-800">{qty[i]}</span>
                <button onClick={() => changeQty(i,1)} className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-600">+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div>
          <div className="card">
            <div className="text-sm font-medium text-gray-800 mb-3">Resumen</div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 min-h-[120px]">
              {selected.length === 0 ? (
                <p className="text-xs text-gray-400">Agrega items del menú...</p>
              ) : (
                MENU.map((item, i) => qty[i] > 0 && (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">{qty[i]}x {item.name}</span>
                    <span className="text-gray-900">${item.price * qty[i]}</span>
                  </div>
                ))
              )}
              {selected.length > 0 && (
                <div className="flex justify-between text-sm font-semibold pt-2 mt-2 border-t border-gray-200">
                  <span>Total</span><span>${total}</span>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Nota (opcional)</label>
              <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Sin cebolla, sin picante..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={handleSubmit} disabled={saving || !selected.length} className="btn-primary w-full py-2.5 disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar a cocina →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
