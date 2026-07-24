import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// GET /api/recommend?productId=&category=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const category = searchParams.get('category')

  if (!category) return NextResponse.json([])

  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .limit(7)

  if (productId) query = query.neq('id', productId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return max 6
  return NextResponse.json((data ?? []).slice(0, 6))
}
