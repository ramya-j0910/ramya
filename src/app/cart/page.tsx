'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Trash2, Minus, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch, CartItem } from '@/lib/supabase'

export default function CartPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    authedFetch('/api/cart')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
  }, [user, authLoading, router])

  async function updateQty(productId: string, delta: number) {
    const item = items.find(i => i.product_id === productId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty < 1) {
      await removeItem(productId)
      return
    }
    await authedFetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity: newQty }),
    })
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: newQty } : i))
  }

  async function removeItem(productId: string) {
    await authedFetch(`/api/cart?product_id=${productId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }

  async function placeOrder() {
    setPlacing(true)
    const res = await authedFetch('/api/orders', { method: 'POST' })
    const data = await res.json()
    setPlacing(false)

    if (res.ok) {
      setItems([])
      setOrderSuccess(data.id)
    } else {
      alert(data.error ?? 'Failed to place order')
    }
  }

  const total = items.reduce((sum, item) => sum + (item.products?.price ?? 0) * item.quantity, 0)

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  }

  if (orderSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center bg-green-50 border border-green-200 rounded-2xl p-12 max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Order Placed!</h2>
          <p className="text-green-600 mb-2">Your order is confirmed.</p>
          <p className="text-sm text-gray-500 mb-6">Order ID: <code className="bg-white px-2 py-0.5 rounded text-xs">{orderSuccess}</code></p>
          <div className="flex gap-3 justify-center">
            <Link href="/orders" className="btn-primary">View Orders</Link>
            <Link href="/" className="btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="text-violet-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>
        <span className="badge bg-violet-100 text-violet-700">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 text-lg">Your cart is empty</p>
          <Link href="/" className="btn-primary mt-6 inline-block">Browse Catalog</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => {
              const p = item.products!
              return (
                <div key={item.product_id} className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4">
                  <Link href={`/product/${p.id}`}>
                    <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-xs">No img</div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${p.id}`}>
                      <p className="font-semibold text-gray-900 hover:text-violet-600">{p.name}</p>
                    </Link>
                    <p className="text-sm text-gray-500 capitalize">{p.category}</p>
                    <p className="font-bold text-violet-700 mt-1">₹{p.price.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => updateQty(p.id, -1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(p.id, 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => removeItem(p.id)} className="ml-2 p-1.5 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{(p.price * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                {items.map(item => (
                  <div key={item.product_id} className="flex justify-between text-gray-600">
                    <span className="truncate max-w-[60%]">{item.products?.name} × {item.quantity}</span>
                    <span>₹{((item.products?.price ?? 0) * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-violet-700">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="btn-primary w-full mt-6 text-base py-3"
              >
                {placing ? 'Placing Order…' : 'Place Order'}
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">No payment required for this demo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
