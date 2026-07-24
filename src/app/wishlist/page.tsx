'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { WishlistItem } from '@/lib/supabase'

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    fetch('/api/wishlist')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
  }, [user, authLoading, router])

  async function removeItem(productId: string) {
    await fetch(`/api/wishlist?product_id=${productId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }

  async function addToCart(productId: string) {
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    router.push('/cart')
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Heart className="text-violet-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <span className="badge bg-violet-100 text-violet-700">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 text-lg">Your wishlist is empty</p>
          <Link href="/" className="btn-primary mt-6 inline-block">Browse Catalog</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map(item => {
            const p = item.products!
            return (
              <div key={item.product_id} className="card">
                <Link href={`/product/${p.id}`}>
                  <div className="relative aspect-[3/4] bg-gray-100">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300 text-sm">No image</div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/product/${p.id}`}>
                    <p className="font-semibold text-gray-900 truncate hover:text-violet-600">{p.name}</p>
                  </Link>
                  <p className="font-bold text-violet-700 mt-1">₹{p.price.toLocaleString('en-IN')}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addToCart(p.id)}
                      className="btn-primary text-xs flex-1 py-2"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => removeItem(p.id)}
                      className="p-2 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
