import { createClient } from './supabase'
import type { Profile, Restaurant } from './supabase'

export async function getSessionData(): Promise<{
  profile: Profile | null
  restaurant: Restaurant | null
}> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { profile: null, restaurant: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { profile: null, restaurant: null }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', profile.restaurant_id)
    .single()

  return { profile, restaurant }
}
