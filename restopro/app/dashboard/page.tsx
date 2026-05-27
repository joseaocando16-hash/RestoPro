'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const horaData = [
  {h:'10am',v:120},{h:'11am',v:200},{h:'12pm',v:450},{h:'1pm',v:620},
  {h:'2pm',v:540},{h:'3pm',v:310},{h:'4pm',v:470},{h:'5pm',v:580},{h:'6pm',v:720},
]
const topItems = [
  {name:'Tacos',qty:48},{name:'Hamburguesa',qty:32},{name:'Pizza',qty:28},{name:'Ensalada',qty:21},
]

export default function DashboardPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
      if (!p) return
      const { data: r } = await supabase.from('restaurants').select('*').eq('id', p.restaurant_id).single()
      setRestaurant(r)
      const [{ data: ord }, { data: inv }] = await Promise.all([
        supabase.from('orders').select('*').eq('restaurant_id', p.restaurant_id).order('created_at', { ascending: false }).limit(20),
        supabase.from('inventory').select('*').eq('restaurant_id', p.restaurant_id),
      ])
      setOrders(ord || [])
      setInventory(inv || [])
      setLoading(false)
    }
    load()
  }, [])

  const activeOrders = orders.filter(o => o.status !== 'entregado')
  const todaySales = orders.reduce((s, o) => s + (o.total || 0), 0)
  const lowStock = inventory.filter(i => i.stock < i.min_stock).length

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Dashboard</h1>
        {restaurant && <p className="text-xs text-gray-400 mb-5">{restaurant.name}</p>}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="metric-card"><div className="text-xs text-gray-500 mb-1">Pedidos hoy</div><div className="text-2xl font-semibold">{orders.length}</div><div className="text-xs text-gray-400">{activeOrders.length} activos</div></div>
          <div className="metric-card"><div className="text-xs text-gray-500 mb-1">Ventas hoy</div><div className="text-2xl font-semibold">${todaySales.toLocaleString('es-MX')}</div></div>
          <div className="metric-card"><div className="text-xs text-gray-500 mb-1">Mesas activas</div><div className="text-2xl font-semibold">{activeOrders.length}</div></div>
          <div className="metric-card"><div className="text-xs text-gray-500 mb-1">Alertas stock</div><div className={`text-2xl font-semibold ${lowStock > 0 ? 'text-red-600' : ''}`}>{lowStock}</div></div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card">
            <div className="text-sm font-medium text-gray-800 mb-4">Ventas por hora</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={horaData}>
                <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15}/><stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="h" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
                <Tooltip formatter={(v:any)=>[`$${v}`,'Ventas']}/>
                <Area type="monotone" dataKey="v" stroke="#1D9E75" fill="url(#grad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-800 mb-4">Más vendidos</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:11}}/><YAxis dataKey="name" type="category" tick={{fontSize:11}} width={80}/>
                <Tooltip/><Bar dataKey="qty" fill="#1D9E75" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-3">Pedidos activos</div>
          {loading ? <p className="text-sm text-gray-400">Cargando...</p> : activeOrders.length === 0 ? (
            <p className="text-sm text-gray-400">No hay pedidos activos.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2">Mesa</th><th className="text-left pb-2">Total</th><th className="text-left pb-2">Estado</th>
              </tr></thead>
              <tbody>{activeOrders.slice(0,6).map(o=>(
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2">{o.table_name}</td>
                  <td className="py-2 font-medium">${o.total}</td>
                  <td className="py-2"><span className={`badge ${o.status==='pendiente'?'badge-warning':o.status==='cocina'?'badge-info':'badge-success'}`}>{o.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
