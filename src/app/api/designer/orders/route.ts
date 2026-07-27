import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** Verify the requesting user is a designer, returns their user id or null */
async function getDesignerId(request: NextRequest): Promise<string | null> {
  const h = request.headers.get('Authorization') ?? ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null

  // Use anon client with the user's JWT to verify identity
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await anonClient.auth.getUser()
  if (!user) return null

  const { data: profile } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'designer') return null
  return user.id
}

/** Service role client — bypasses RLS so we can read any user's orders */
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/designer/orders
// Returns all orders that contain at least one product belonging to this designer
export async function GET(request: NextRequest) {
  const designerId = await getDesignerId(request)
  if (!designerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()

  // 1. Get this designer's product ids
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id')
    .eq('designer_id', designerId)

  if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })
  if (!products || products.length === 0) return NextResponse.json([])

  const productIds = products.map((p: { id: string }) => p.id)

  // 2. Find order_ids that contain those products
  const { data: orderItemRows, error: oiError } = await supabase
    .from('order_items')
    .select('order_id')
    .in('product_id', productIds)

  if (oiError) return NextResponse.json({ error: oiError.message }, { status: 500 })
  if (!orderItemRows || orderItemRows.length === 0) return NextResponse.json([])

  const orderIds = Array.from(new Set(orderItemRows.map((r: { order_id: string }) => r.order_id)))

  // 3. Fetch full orders with customer profile and all order items
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, created_at, user_id, total, profiles(full_name), order_items(quantity, price, product_id, products(id, name))')
    .in('id', orderIds)
    .order('created_at', { ascending: false })

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
  return NextResponse.json(orders ?? [])
}

// PATCH /api/designer/orders  { order_id, status }
// Lets the designer update the status of one of their orders
export async function PATCH(request: NextRequest) {
  const designerId = await getDesignerId(request)
  if (!designerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id, status } = await request.json()
  if (!order_id || !status) return NextResponse.json({ error: 'Missing order_id or status' }, { status: 400 })

  const supabase = serviceClient()

  // Verify this order actually contains a product by this designer (safety check)
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('designer_id', designerId)

  const productIds = (products ?? []).map((p: { id: string }) => p.id)

  const { data: match } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('order_id', order_id)
    .in('product_id', productIds)
    .limit(1)
    .single()

  if (!match) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', order_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
