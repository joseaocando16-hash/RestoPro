'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const horaData = [
  {h:'10am',v:120},{h:'11am',v:200},{h:'12pm',v:450},{h:'1pm',v:620},
  {h:'2pm',v:540},{h:'3pm',v:310},{h:'4pm',v:280},{h:'5pm',v:390},
  {h:'6pm',v:580},{h:'7pm',v:720},{h:'8pm',v:650},{h:'9pm',v:430},
]
const topItems = [
  {name:'Tacos',qty:48},{name:'Hamburguesa',qty:32},{name:'Pizza',qty:28},{name:'Ensalada',qty:21},{name:'Pasta',qty:18}
]

export default function DashboardPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ord }, { data: inv }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('inventory').select('*'),
      ])
      setOrders(ord || [])
      setInventory(inv || [])
      setLoading(false)
    }
    load()
  }, [])

  const activeOrders = orders.filter(o => o.status !== 'entregado')
  const todaySales = orders.reduce((s, o) => s + (o.total || 0), 0)
  const lowStock = (inventory || []).filter(i => i.stock < i.min_stock).length

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Pedidos hoy</div>
          <div className="text-2xl font-semibold text-gray-900">{orders.length}</div>
          <div className="text-xs text-gray-400 mt-1">{activeOrders.length} activos</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Ventas hoy</div>
          <div className="text-2xl font-semibold text-gray-900">${todaySales.toLocaleString('es-MX')}</div>
          <div className="text-xs text-gray-400 mt-1">acumulado</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Mesas activas</div>
          <div className="text-2xl font-semibold text-gray-900">{activeOrders.length}</div>
          <div className="text-xs text-gray-400 mt-1">en curso</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Alertas stock</div>
          <div className={`text-2xl font-semibold ${lowStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStock}</div>
          <div className="text-xs text-gray-400 mt-1">bajo mínimo</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Chart ventas */}
        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-4">Ventas por hora</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={horaData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="h" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`$${v}`, 'Ventas']} />
              <Area type="monotone" dataKey="v" stroke="#1D9E75" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart top */}
        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-4">Productos más vendidos</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="qty" fill="#1D9E75" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active orders */}
      <div className="card">
        <div className="text-sm font-medium text-gray-800 mb-3">Pedidos activos recientes</div>
        {loading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : activeOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No hay pedidos activos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2">Pedido</th><th className="text-left pb-2">Mesa</th>
              <th className="text-left pb-2">Total</th><th className="text-left pb-2">Estado</th>
            </tr></thead>
            <tbody>{activeOrders.slice(0,6).map(o => (
              <tr key={o.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-medium">#{String(o.id).slice(0,6)}</td>
                <td className="py-2 text-gray-500">{o.table_name}</td>
                <td className="py-2">${o.total}</td>
                <td className="py-2">
                  <span className={`badge ${o.status === 'pendiente' ? 'badge-warning' : o.status === 'cocina' ? 'badge-info' : 'badge-success'}`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
