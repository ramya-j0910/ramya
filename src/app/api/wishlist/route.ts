import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/wishlist
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wishlist')
    .select('*, products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/wishlist  { product_id }
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { product_id } = await request.json()
  const { data, error } = await supabase
    .from('wishlist')
    .insert({ user_id: user.id, product_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/wishlist?product_id=
export async function DELETE(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product_id = new URL(request.url).searchParams.get('product_id')
  if (!product_id) return NextResponse.json({ error: 'Missing product_id' }, { status: 400 })

  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
