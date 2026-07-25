'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react'
import { supabase, Product } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import ProductCard from '@/components/ProductCard'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [recommended, setRecommended] = useState<Product[]>([])
  const [wishlisted, setWishlisted] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cartLoading, setCartLoading] = useState(false)
  const [wishLoading, setWishLoading] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      setProduct(data)
      setLoading(false)

      if (data) {
        const recRes = await fetch(`/api/recommend?productId=${id}&category=${encodeURIComponent(data.category)}`)
        const recData = await recRes.json()
        setRecommended(Array.isArray(recData) ? recData : [])
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || !product) return
    async function checkStatus() {
      const { data: w } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', user!.id)
        .eq('product_id', product!.id)
        .maybeSingle()
      setWishlisted(!!w)

      const { data: c } = await supabase
        .from('cart_items')
        .select('product_id')
        .eq('user_id', user!.id)
        .eq('product_id', product!.id)
        .maybeSingle()
      setInCart(!!c)
    }
    checkStatus()
  }, [user, product])

  async function handleWishlist() {
    if (!user) { router.push('/login'); return }
    setWishLoading(true)
    if (wishlisted) {
      const { error } = await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product!.id)
      if (error) { alert('Wishlist remove error: ' + error.message + ' | code: ' + error.code); setWishLoading(false); return }
      setWishlisted(false)
      showToast('Removed from wishlist')
    } else {
      const { error } = await supabase.from('wishlist').insert({ user_id: user.id, product_id: product!.id })
      if (error) { alert('Wishlist add error: ' + error.message + ' | code: ' + error.code); setWishLoading(false); return }
      setWishlisted(true)
      showToast('Added to wishlist ♥')
    }
    setWishLoading(false)
  }

  async function handleAddToCart() {
    if (!user) { router.push('/login'); return }
    setCartLoading(true)
    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('product_id', product!.id)
      .single()
    if (existing) {
      const { error } = await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('user_id', user.id).eq('product_id', product!.id)
      if (error) { alert('Cart update error: ' + error.message + ' | code: ' + error.code); setCartLoading(false); return }
    } else {
      const { error } = await supabase.from('cart_items').insert({ user_id: user.id, product_id: product!.id, quantity: 1 })
      if (error) { alert('Cart insert error: ' + error.message + ' | code: ' + error.code); setCartLoading(false); return }
    }
    setInCart(true)
    showToast('Added to cart 🛍️')
    setCartLoading(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-80 bg-gray-100 rounded-2xl" />
        <div className="h-6 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500">Product not found</p>
        <button onClick={() => router.back()} className="btn-primary mt-4">Go back</button>
      </div>
    )
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-lg transition-all">
          {toast}
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">No image</div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <span className="badge bg-violet-100 text-violet-700 mb-3 w-fit capitalize">
            {product.category}
          </span>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-3xl font-bold text-violet-700 mt-3">
            ₹{product.price.toLocaleString('en-IN')}
          </p>

          {product.description && (
            <p className="text-gray-600 mt-4 leading-relaxed">{product.description}</p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={handleWishlist}
              disabled={wishLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-medium transition-colors ${
                wishlisted
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'btn-secondary'
              }`}
            >
              <Heart size={18} className={wishlisted ? 'fill-red-500 text-red-500' : ''} />
              {wishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>

            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
            >
              <ShoppingBag size={18} />
              {inCart ? 'Add Again' : 'Add to Cart'}
            </button>
          </div>

          {inCart && (
            <button
              onClick={() => router.push('/cart')}
              className="mt-3 text-sm text-violet-600 font-medium hover:underline"
            >
              View cart →
            </button>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recommended.map(rec => (
              <ProductCard key={rec.id} product={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
