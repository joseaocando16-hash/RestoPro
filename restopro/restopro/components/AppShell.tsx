'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Profile, Restaurant, Role } from '@/lib/supabase'

const NAV_BY_ROLE: Record<Role, { href: string; label: string; icon: string }[]> = {
  owner: [
    { href: '/dashboard',  label: 'Dashboard',  icon: '📊' },
    { href: '/pedidos',    label: 'Pedidos',     icon: '🧾' },
    { href: '/inventario', label: 'Inventario',  icon: '📦' },
    { href: '/reportes',   label: 'Reportes',    icon: '📈' },
    { href: '/alertas',    label: 'Alertas',     icon: '🔔' },
  ],
  cajero: [
    { href: '/caja',       label: 'Caja',        icon: '💳' },
    { href: '/pedidos',    label: 'Pedidos',      icon: '🧾' },
  ],
  cocina: [
    { href: '/cocina',     label: 'Cocina',       icon: '👨‍🍳' },
  ],
  camarero: [
    { href: '/mesas',      label: 'Mis mesas',    icon: '🪑' },
    { href: '/nuevo-pedido', label: 'Nuevo pedido', icon: '➕' },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  owner:    'Administrador',
  cajero:   'Cajero',
  cocina:   'Cocina',
  camarero: 'Camarero',
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }

      const { data: r } = await supabase.from('restaurants').select('*').eq('id', p.restaurant_id).single()
      setProfile(p)
      setRestaurant(r)
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Cargando...</div>
      </div>
    )
  }

  const role = profile?.role as Role
  const nav = NAV_BY_ROLE[role] || []

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">🍽️ {restaurant?.name || 'RestoPro'}</div>
          <div className="text-xs text-gray-400 mt-0.5">{ROLE_LABEL[role]}</div>
        </div>
        <nav className="flex-1 py-2">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 truncate mb-1">{profile?.full_name}</div>
          <div className="text-xs text-gray-400 truncate mb-2">{ROLE_LABEL[role]}</div>
          <button onClick={handleLogout} className="btn-ghost w-full text-center text-xs">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
