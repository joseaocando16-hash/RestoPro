'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const COLORS = ['#1D9E75','#378ADD','#EF9F27','#D4537E','#7F77DD']

export default function ReportesPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('orders').select('*').then(({ data }) => {
      setOrders(data || [])
      setLoading(false)
    })
  }, [])

  // Build weekly chart data from orders
  const weekData = DAYS.map((d, i) => ({
    day: d,
    ventas: orders.filter(o => new Date(o.created_at).getDay() === i).reduce((s,o)=>s+o.total,0)
  }))

  const totalWeek = orders.reduce((s,o)=>s+o.total,0)
  const avgTicket = orders.length ? Math.round(totalWeek / orders.length) : 0

  const catData = [
    { name:'Platos fuertes', value:45 },
    { name:'Bebidas', value:25 },
    { name:'Entradas', value:20 },
    { name:'Postres', value:10 },
  ]

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">Reportes</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Total pedidos</div>
          <div className="text-2xl font-semibold text-gray-900">{orders.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Ventas totales</div>
          <div className="text-2xl font-semibold text-gray-900">${totalWeek.toLocaleString('es-MX')}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Ticket promedio</div>
          <div className="text-2xl font-semibold text-gray-900">${avgTicket}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Satisfacción</div>
          <div className="text-2xl font-semibold text-gray-900">4.7 ⭐</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-4">Ventas por día de la semana</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} />
              <Tooltip formatter={(v:any)=>[`$${v}`,'Ventas']} />
              <Bar dataKey="ventas" fill="#1D9E75" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium text-gray-800 mb-4">Ventas por categoría</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={catData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({name,value})=>`${value}%`} labelLine={false}>
                {catData.map((_,i)=><Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{fontSize:11}} />
              <Tooltip formatter={(v:any)=>[`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders table */}
      <div className="card">
        <div className="text-sm font-medium text-gray-800 mb-3">Historial de pedidos</div>
        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2">ID</th><th className="text-left pb-2">Mesa</th>
              <th className="text-left pb-2">Total</th><th className="text-left pb-2">Estado</th>
              <th className="text-left pb-2">Fecha</th>
            </tr></thead>
            <tbody>{orders.slice(0,20).map(o=>(
              <tr key={o.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-mono text-xs">#{String(o.id).slice(0,8)}</td>
                <td className="py-2 text-gray-500">{o.table_name}</td>
                <td className="py-2 font-medium">${o.total}</td>
                <td className="py-2"><span className="badge badge-gray">{o.status}</span></td>
                <td className="py-2 text-gray-400 text-xs">{new Date(o.created_at).toLocaleString('es-MX')}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
