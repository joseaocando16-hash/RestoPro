'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

interface Modifier { id: string; name: string; type: 'toggle'|'select'; options: string[]|null; default_val: string }
interface MenuItem { id: string; name: string; price: number; category: string; image_url: string; modifiers: Modifier[] }
interface OrderItem { menuItem: MenuItem; qty: number; selectedModifiers: Record<string, boolean|string> }

export default function NuevoPedidoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mesa, setMesa] = useState('Mesa 1')
  const [note, setNote] = useState('')
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [saving, setSaving] = useState(false)
  const [restaurantId, setRestaurantId] = useState('')
  const [activeItem, setActiveItem] = useState<string|null>(null)
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
      if (!p) return
      setRestaurantId(p.restaurant_id)
      const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', p.restaurant_id).eq('available', true).order('category').order('sort_order')
      const menuWithMods: MenuItem[] = []
      for (const item of items || []) {
        const { data: mods } = await supabase.from('menu_modifiers').select('*').eq('menu_item_id', item.id)
        menuWithMods.push({ ...item, modifiers: mods || [] })
      }
      setMenu(menuWithMods)
      setLoading(false)
    }
    load()
  }, [])

  const categories = ['Todos', ...Array.from(new Set(menu.map(i => i.category)))]
  const filteredMenu = activeCategory === 'Todos' ? menu : menu.filter(i => i.category === activeCategory)

  function addItem(menuItem: MenuItem) {
    const defaultMods: Record<string, boolean|string> = {}
    menuItem.modifiers.forEach(m => {
      defaultMods[m.id] = m.type === 'toggle' ? m.default_val === 'true' : m.options?.[0] ?? ''
    })
    setActiveItem(menuItem.id)
    setOrderItems(prev => {
      const exists = prev.find(i => i.menuItem.id === menuItem.id)
      if (exists) return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, qty: i.qty+1 } : i)
      return [...prev, { menuItem, qty: 1, selectedModifiers: defaultMods }]
    })
  }

  function removeItem(id: string) {
    setOrderItems(prev => prev.filter(i => i.menuItem.id !== id))
    if (activeItem === id) setActiveItem(null)
  }

  function updateQty(id: string, delta: number) {
    setOrderItems(prev => prev.map(i => {
      if (i.menuItem.id !== id) return i
      const newQty = Math.max(0, i.qty + delta)
      return newQty === 0 ? null : { ...i, qty: newQty }
    }).filter(Boolean) as OrderItem[])
  }

  function updateMod(itemId: string, modId: string, value: boolean|string) {
    setOrderItems(prev => prev.map(i =>
      i.menuItem.id === itemId ? { ...i, selectedModifiers: { ...i.selectedModifiers, [modId]: value } } : i
    ))
  }

  const total = orderItems.reduce((s, i) => s + i.menuItem.price * i.qty, 0)

  function buildDescription(item: OrderItem): string {
    const mods = item.menuItem.modifiers.map(m => {
      const val = item.selectedModifiers[m.id]
      if (m.type === 'toggle' && val === false) return `sin ${m.name.toLowerCase()}`
      if (m.type === 'select' && val && val !== m.options?.[0]) return String(val)
      return null
    }).filter(Boolean)
    return `${item.qty}x ${item.menuItem.name}${mods.length ? ` (${mods.join(', ')})` : ''}`
  }

  async function handleSubmit() {
    if (!orderItems.length || !restaurantId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('orders').insert({
      restaurant_id: restaurantId, table_name: mesa,
      items: orderItems.map(buildDescription), note, total,
      status: 'pendiente', created_by: user?.id,
    })
    router.push('/mesas')
  }

  const activeOrderItem = activeItem ? orderItems.find(i => i.menuItem.id === activeItem) : null

  return (
    <AppShell>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-900">Nuevo pedido</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Mesa</label>
            <select value={mesa} onChange={e => setMesa(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {Array.from({length:15},(_,i)=>`Mesa ${i+1}`).map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {loading ? <p className="text-sm text-gray-400">Cargando menú...</p> : (
          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Menú */}
            <div className="col-span-2 flex flex-col min-h-0">
              <div className="flex gap-2 mb-3 flex-wrap">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCategory===cat?'bg-brand-500 text-white border-brand-500':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              {menu.length === 0 ? (
                <div className="card text-center py-10">
                  <div className="text-3xl mb-2">🍽️</div>
                  <div className="text-sm text-gray-600">No hay platos en el menú</div>
                  <a href="/menu" className="btn-primary inline-block mt-3 text-sm">Ir a gestión del menú</a>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 overflow-y-auto">
                  {filteredMenu.map(item => {
                    const inOrder = orderItems.find(i => i.menuItem.id === item.id)
                    return (
                      <button key={item.id} onClick={() => addItem(item)}
                        className={`text-left rounded-xl border transition-all overflow-hidden ${inOrder?'border-brand-500 bg-brand-50':'border-gray-100 bg-white hover:border-gray-200'}`}>
                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-24 object-cover"/>}
                        {!item.image_url && <div className="w-full h-16 bg-gray-50 flex items-center justify-center text-2xl">🍽️</div>}
                        <div className="p-2.5">
                          <div className="text-sm font-medium text-gray-800 leading-tight">{item.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">${item.price}</div>
                          {inOrder && <div className="mt-1.5 inline-flex bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">{inOrder.qty}x</div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Panel derecho */}
            <div className="flex flex-col gap-3 min-h-0">
              {activeOrderItem && (
                <div className="card flex-shrink-0">
                  <div className="text-xs font-medium text-gray-700 mb-2">✏️ {activeOrderItem.menuItem.name}</div>
                  {activeOrderItem.menuItem.modifiers.map(mod => (
                    <div key={mod.id} className="mb-2">
                      {mod.type === 'toggle' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={activeOrderItem.selectedModifiers[mod.id] as boolean}
                            onChange={e => updateMod(activeOrderItem.menuItem.id, mod.id, e.target.checked)}
                            className="w-4 h-4 accent-brand-500"/>
                          <span className="text-sm text-gray-700">{mod.name}</span>
                        </label>
                      ) : (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{mod.name}</div>
                          <select value={activeOrderItem.selectedModifiers[mod.id] as string}
                            onChange={e => updateMod(activeOrderItem.menuItem.id, mod.id, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                            {mod.options?.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                  {activeOrderItem.menuItem.modifiers.length === 0 && <p className="text-xs text-gray-400">Sin modificadores</p>}
                </div>
              )}

              <div className="card flex-1 overflow-y-auto">
                <div className="text-xs font-medium text-gray-700 mb-2">Pedido</div>
                {orderItems.length === 0 ? (
                  <p className="text-xs text-gray-400">Selecciona items del menú...</p>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map(item => (
                      <div key={item.menuItem.id} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-800">{item.menuItem.name}</span>
                          <button onClick={() => removeItem(item.menuItem.id)} className="text-red-400 text-xs">✕</button>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.menuItem.modifiers.map(m => {
                            const val = item.selectedModifiers[m.id]
                            if (m.type==='toggle' && val===false) return `sin ${m.name.toLowerCase()}`
                            if (m.type==='select' && val) return String(val)
                            return null
                          }).filter(Boolean).join(' · ')}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateQty(item.menuItem.id,-1)} className="w-5 h-5 rounded-full border border-gray-200 text-xs flex items-center justify-center">−</button>
                            <span className="text-xs w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.menuItem.id,1)} className="w-5 h-5 rounded-full border border-gray-200 text-xs flex items-center justify-center">+</button>
                          </div>
                          <span className="text-xs font-medium">${item.menuItem.price * item.qty}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-gray-100">
                      <span>Total</span><span>${total}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <input type="text" value={note} onChange={e=>setNote(e.target.value)}
                  placeholder="Nota general..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"/>
                <button onClick={handleSubmit} disabled={saving||!orderItems.length}
                  className="btn-primary w-full py-2.5 disabled:opacity-50">
                  {saving ? 'Enviando...' : `Enviar a cocina — $${total}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
