'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

export default function SuperAdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', address: '', phone: '' })
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'owner', restaurant_id: '' })
  const [showAddUser, setShowAddUser] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
    if (!p?.is_super_admin) { router.push('/dashboard'); return }
    const { data: rests } = await supabase.from('restaurants').select('*').order('name')
    const { data: profs } = await supabase.from('profiles').select('*, restaurants(name)').order('created_at')
    setRestaurants(rests || [])
    setUsers(profs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addRestaurant() {
    if (!form.name || !form.slug) return
    await supabase.from('restaurants').insert(form)
    setForm({ name: '', slug: '', address: '', phone: '' })
    setShowAdd(false)
    setMsg('✅ Restaurante creado')
    load()
  }

  async function deleteRestaurant(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}" y todos sus datos?`)) return
    await supabase.from('restaurants').delete().eq('id', id)
    load()
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">⚙️ Super Admin</h1>
            <p className="text-xs text-gray-400 mt-0.5">Gestión de todos los restaurantes</p>
          </div>
        </div>

        {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg mb-4">{msg}</div>}

        {/* Restaurantes */}
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-800">Restaurantes ({restaurants.length})</div>
            <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">+ Nuevo restaurante</button>
          </div>

          {showAdd && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Mi Restaurante" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Slug (único) *</label>
                  <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/\s+/g,'-')})} placeholder="mi-restaurante" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dirección</label>
                  <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Av. Principal 123" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                  <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+1 234 567 8900" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addRestaurant} className="btn-primary text-sm">Crear restaurante</button>
                <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
            <div className="space-y-2">
              {restaurants.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-gray-800">🍽️ {r.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.address || 'Sin dirección'} · /{r.slug}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{r.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400">{users.filter(u => u.restaurant_id === r.id).length} usuarios</span>
                    <button onClick={() => deleteRestaurant(r.id, r.name)}
                      className="text-xs px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usuarios */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-800">Usuarios ({users.length})</div>
          </div>
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            💡 Para crear usuarios: ve a <strong>Supabase → Authentication → Users → Add user</strong>, luego ejecuta en SQL Editor:<br/>
            <code className="bg-amber-100 px-1 rounded mt-1 block">insert into profiles (id, restaurant_id, full_name, role) values ('UUID', 'RESTAURANT_ID', 'Nombre', 'owner');</code>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2">Nombre</th>
              <th className="text-left pb-2">Rol</th>
              <th className="text-left pb-2">Restaurante</th>
              <th className="text-left pb-2">Super Admin</th>
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2">{u.full_name || 'Sin nombre'}</td>
                <td className="py-2"><span className="badge badge-gray">{u.role}</span></td>
                <td className="py-2 text-gray-500">{(u.restaurants as any)?.name || '—'}</td>
                <td className="py-2">{u.is_super_admin ? '✅' : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
