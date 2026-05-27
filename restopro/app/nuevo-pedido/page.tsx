'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

interface Modifier {
  id: string
  name: string
  type: 'toggle' | 'select'
  options?: string[]
  default?: boolean | string
}

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  modifiers: Modifier[]
}

const DEFAULT_MENU: MenuItem[] = [
  {
    id: '1', name: 'Tacos al pastor', price: 85, category: 'Platos',
    modifiers: [
      { id: 'm1', name: 'Cebolla', type: 'toggle', default: true },
      { id: 'm2', name: 'Cilantro', type: 'toggle', default: true },
      { id: 'm3', name: 'Salsa', type: 'select', options: ['Sin salsa', 'Salsa verde', 'Salsa roja', 'Salsa habanero'], default: 'Salsa verde' },
    ]
  },
  {
    id: '2', name: 'Hamburguesa clásica', price: 145, category: 'Platos',
    modifiers: [
      { id: 'm1', name: 'Lechuga', type: 'toggle', default: true },
      { id: 'm2', name: 'Tomate', type: 'toggle', default: true },
      { id: 'm3', name: 'Cebolla', type: 'toggle', default: true },
      { id: 'm4', name: 'Queso', type: 'toggle', default: true },
      { id: 'm5', name: 'Tocineta', type: 'toggle', default: false },
      { id: 'm6', name: 'Salsa', type: 'select', options: ['Sin salsa', 'Mayonesa', 'Mostaza', 'BBQ'], default: 'Mayonesa' },
    ]
  },
  {
    id: '3', name: 'Pizza personal', price: 130, category: 'Platos',
    modifiers: [
      { id: 'm1', name: 'Extra queso', type: 'toggle', default: false },
      { id: 'm2', name: 'Tipo', type: 'select', options: ['Masa delgada', 'Masa gruesa'], default: 'Masa delgada' },
    ]
  },
  {
    id: '4', name: 'Ensalada César', price: 95, category: 'Platos',
    modifiers: [
      { id: 'm1', name: 'Crutones', type: 'toggle', default: true },
      { id: 'm2', name: 'Aderezo', type: 'select', options: ['César', 'Ranch', 'Vinagreta'], default: 'César' },
    ]
  },
  {
    id: '5', name: 'Pasta alfredo', price: 165, category: 'Platos',
    modifiers: [
      { id: 'm1', name: 'Extra salsa', type: 'toggle', default: false },
    ]
  },
  { id: '6', name: 'Agua fresca', price: 35, category: 'Bebidas', modifiers: [] },
  { id: '7', name: 'Cerveza', price: 65, category: 'Bebidas', modifiers: [] },
  { id: '8', name: 'Refresco', price: 30, category: 'Bebidas', modifiers: [] },
]

interface OrderItem {
  menuItem: MenuItem
  qty: number
  selectedModifiers: Record<string, boolean | string>
}

export default function NuevoPedidoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mesa, setMesa] = useState('Mesa 1')
  const [note, setNote] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [saving, setSaving] = useState(false)
  const [restaurantId, setRestaurantId] = useState('')
  const [activeItem, setActiveItem] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('Todos')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
      if (p) setRestaurantId(p.restaurant_id)
    }
    load()
  }, [])

  const categories = ['Todos', ...Array.from(new Set(DEFAULT_MENU.map(i => i.category)))]
  const filteredMenu = activeCategory === 'Todos' ? DEFAULT_MENU : DEFAULT_MENU.filter(i => i.category === activeCategory)

  function addItem(menuItem: MenuItem) {
    const defaultMods: Record<string, boolean | string> = {}
    menuItem.modifiers.forEach(m => {
      defaultMods[m.id] = m.default ?? (m.type === 'toggle' ? true : m.options?.[0] ?? '')
    })
    if (menuItem.modifiers.length > 0) {
      setActiveItem(menuItem.id)
      setOrderItems(prev => {
        const exists = prev.find(i => i.menuItem.id === menuItem.id)
        if (exists) return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, qty: i.qty + 1 } : i)
        return [...prev, { menuItem, qty: 1, selectedModifiers: defaultMods }]
      })
    } else {
      setOrderItems(prev => {
        const exists = prev.find(i => i.menuItem.id === menuItem.id)
        if (exists) return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, qty: i.qty + 1 } : i)
        return [...prev, { menuItem, qty: 1, selectedModifiers: {} }]
      })
    }
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

  function updateMod(itemId: string, modId: string, value: boolean | string) {
    setOrderItems(prev => prev.map(i =>
      i.menuItem.id === itemId
        ? { ...i, selectedModifiers: { ...i.selectedModifiers, [modId]: value } }
        : i
    ))
  }

  const total = orderItems.reduce((s, i) => s + i.menuItem.price * i.qty, 0)

  function buildItemDescription(item: OrderItem): string {
    const mods = item.menuItem.modifiers.map(m => {
      const val = item.selectedModifiers[m.id]
      if (m.type === 'toggle') return val === false ? `sin ${m.name.toLowerCase()}` : null
      if (m.type === 'select' && val !== m.options?.[0] && val) return String(val)
      return null
    }).filter(Boolean)
    return `${item.qty}x ${item.menuItem.name}${mods.length ? ` (${mods.join(', ')})` : ''}`
  }

  async function handleSubmit() {
    if (!orderItems.length || !restaurantId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const items = orderItems.map(buildItemDescription)
    await supabase.from('orders').insert({
      restaurant_id: restaurantId,
      table_name: mesa,
      items,
      note,
      total,
      status: 'pendiente',
      created_by: user?.id,
    })
    router.push('/mesas')
  }

  const activeOrderItem = activeItem ? orderItems.find(i => i.menuItem.id === activeItem) : null

  return (
    <AppShell>
      <div className="p-6 h-full">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">Nuevo pedido</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Mesa</label>
            <select value={mesa} onChange={e => setMesa(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {Array.from({length:12},(_,i)=>`Mesa ${i+1}`).map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* Menú */}
          <div className="col-span-2 flex flex-col">
            {/* Categorías */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCategory === cat ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {cat}
                </button>
              ))}
            </div>
            {/* Items */}
            <div className="grid grid-cols-3 gap-3 overflow-y-auto">
              {filteredMenu.map(item => {
                const inOrder = orderItems.find(i => i.menuItem.id === item.id)
                return (
                  <button key={item.id} onClick={() => addItem(item)}
                    className={`text-left p-3 rounded-xl border transition-all ${inOrder ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                    <div className="text-sm font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">${item.price}</div>
                    {inOrder && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {inOrder.qty}x
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel derecho */}
          <div className="flex flex-col gap-3">
            {/* Modificadores */}
            {activeOrderItem && (
              <div className="card flex-shrink-0">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Personalizar: {activeOrderItem.menuItem.name}
                </div>
                {activeOrderItem.menuItem.modifiers.map(mod => (
                  <div key={mod.id} className="mb-2">
                    {mod.type === 'toggle' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={activeOrderItem.selectedModifiers[mod.id] as boolean}
                          onChange={e => updateMod(activeOrderItem.menuItem.id, mod.id, e.target.checked)}
                          className="w-4 h-4 accent-brand-500"/>
                        <span className="text-sm text-gray-700">{mod.name}</span>
                      </label>
                    ) : (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">{mod.name}</div>
                        <select
                          value={activeOrderItem.selectedModifiers[mod.id] as string}
                          onChange={e => updateMod(activeOrderItem.menuItem.id, mod.id, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                          {mod.options?.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resumen pedido */}
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
                        <button onClick={() => removeItem(item.menuItem.id)}
                          className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.menuItem.modifiers.map(m => {
                          const val = item.selectedModifiers[m.id]
                          if (m.type === 'toggle' && val === false) return `sin ${m.name.toLowerCase()}`
                          if (m.type === 'select' && val) return String(val)
                          return null
                        }).filter(Boolean).join(' · ')}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQty(item.menuItem.id, -1)}
                            className="w-5 h-5 rounded-full border border-gray-200 text-xs flex items-center justify-center">−</button>
                          <span className="text-xs w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.menuItem.id, 1)}
                            className="w-5 h-5 rounded-full border border-gray-200 text-xs flex items-center justify-center">+</button>
                        </div>
                        <span className="text-xs font-medium">${item.menuItem.price * item.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {orderItems.length > 0 && (
                <div className="flex justify-between text-sm font-semibold pt-2 mt-2 border-t border-gray-100">
                  <span>Total</span><span>${total}</span>
                </div>
              )}
            </div>

            {/* Nota y enviar */}
            <div className="flex-shrink-0">
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Nota general del pedido..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"/>
              <button onClick={handleSubmit} disabled={saving || !orderItems.length}
                className="btn-primary w-full py-2.5 disabled:opacity-50">
                {saving ? 'Enviando...' : `Enviar a cocina — $${total}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
