import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

function getToken(request: NextRequest) {
  const h = request.headers.get('Authorization') ?? ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}

// GET /api/orders
export async function GET(request: NextRequest) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/orders — creates order from cart, clears cart
export async function POST(request: NextRequest) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cartItems, error: cartError } = await supabase
    .from('cart_items')
    .select('*, products(*)')
    .eq('user_id', user.id)

  if (cartError) return NextResponse.json({ error: cartError.message }, { status: 500 })
  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const total = cartItems.reduce((sum: number, item: { products: { price: number }, quantity: number }) => {
    return sum + item.products.price * item.quantity
  }, 0)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ user_id: user.id, total, status: 'pending' })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const orderItems = cartItems.map((item: { product_id: string, quantity: number, products: { price: number } }) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.products.price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  await supabase.from('cart_items').delete().eq('user_id', user.id)

  return NextResponse.json(order, { status: 201 })
}
