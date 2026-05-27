import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type Role = 'owner' | 'cajero' | 'cocina' | 'camarero'

export interface Profile {
  id: string
  restaurant_id: string
  full_name: string
  role: Role
}

export interface Restaurant {
  id: string
  name: string
  slug: string
  address?: string
  phone?: string
}
