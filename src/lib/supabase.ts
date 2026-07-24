import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>)

export type Profile = {
  id: string
  full_name: string | null
  role: 'customer' | 'designer'
  created_at: string
}

export type Product = {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  designer_id: string | null
  created_at: string
}

export type CartItem = {
  user_id: string
  product_id: string
  quantity: number
  products?: Product
}

export type WishlistItem = {
  user_id: string
  product_id: string
  created_at: string
  products?: Product
}

export type Order = {
  id: string
  user_id: string
  status: 'pending' | 'shipped' | 'delivered'
  total: number
  created_at: string
  order_items?: OrderItem[]
}

export type OrderItem = {
  order_id: string
  product_id: string
  quantity: number
  price: number
  products?: Product
}
