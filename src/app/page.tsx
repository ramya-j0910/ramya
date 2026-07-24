'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Product } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import { Search, SlidersHorizontal } from 'lucide-react'

const CATEGORIES = ['All', 'Sarees', 'Kurtas', 'Lehengas', 'Gowns', 'Dresses', 'Tops', 'Co-ords', 'Other']

export default function HomePage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category !== 'All') params.set('category', category)
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search, category])

  const fetchWishlist = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/wishlist')
    const data = await res.json()
    if (Array.isArray(data)) {
      setWishlistIds(new Set(data.map((w: { product_id: string }) => w.product_id)))
    }
  }, [user])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchWishlist() }, [fetchWishlist])

  async function handleWishlist(productId: string) {
    if (!user) { window.location.href = '/login'; return }
    if (wishlistIds.has(productId)) {
      await fetch(`/api/wishlist?product_id=${productId}`, { method: 'DELETE' })
      setWishlistIds(prev => { const s = new Set(prev); s.delete(productId); return s })
    } else {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      setWishlistIds(prev => new Set(Array.from(prev).concat(productId)))
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-violet-50 rounded-2xl p-8 md:p-12 mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-violet-800 mb-3">
          Fashion that tells your story
        </h1>
        <p className="text-gray-600 text-lg max-w-xl mx-auto">
          Discover curated designs from independent designers.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search dresses, sarees, kurtis…"
            className="input pl-9"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input pl-9 pr-10 appearance-none cursor-pointer min-w-[160px]"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === c
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl font-medium">No products found</p>
          <p className="text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              wishlisted={wishlistIds.has(product.id)}
              onWishlist={handleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  )
}
