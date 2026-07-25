import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/products?search=&category=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''

  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('name', `%${search}%`)
  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/products (designer only)
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // --- TEMPORARY DEBUG ---
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
  console.log('[POST /api/products] cookie names:', cookieNames)
  console.log('[POST /api/products] user:', user?.id ?? null)
  console.log('[POST /api/products] authError:', authError?.message ?? null)
  // --- END DEBUG ---

  if (!user) return NextResponse.json({ error: 'Unauthorized', debug: { cookieNames, authError: authError?.message } }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'designer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, price, category, image_url } = body

  const { data, error } = await supabase
    .from('products')
    .insert({ name, description, price, category, image_url, designer_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
