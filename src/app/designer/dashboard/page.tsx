'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, Upload, TrendingUp, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, authedFetch, Product } from '@/lib/supabase'

type OrderRow = {
  id: string
  status: string
  created_at: string
  user_id: string
  total: number
  profiles: { full_name: string | null } | null
  order_items: {
    quantity: number
    price: number
    product_id: string
    products: { id: string; name: string } | null
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function DesignerDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile && profile.role !== 'designer') { router.push('/'); return }
    if (!profile) return

    async function load() {
      // 1. Load designer's products (own data — no RLS issue)
      const { data: prods, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('designer_id', user!.id)
        .order('created_at', { ascending: false })

      if (prodError) { alert('Error loading products: ' + prodError.message); return }
      const myProducts = (prods as Product[]) ?? []
      setProducts(myProducts)

      // 2. Load orders via API route (uses service role key — bypasses RLS)
      const res = await authedFetch('/api/designer/orders')
      if (!res.ok) {
        const err = await res.json()
        alert('Error loading orders: ' + (err.error ?? res.statusText))
        setLoading(false)
        return
      }
      const orderRows = await res.json()
      setOrders((orderRows as OrderRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [user, profile, authLoading, router])

  async function refresh() {
    if (!user) return
    setRefreshing(true)
    const res = await authedFetch('/api/designer/orders')
    if (res.ok) {
      const orderRows = await res.json()
      setOrders((orderRows as OrderRow[]) ?? [])
    }
    setRefreshing(false)
  }

  async function toggleSoldOut(productId: string, current: boolean) {
    setTogglingProduct(productId)
    const { error } = await supabase
      .from('products')
      .update({ sold_out: !current })
      .eq('id', productId)
    if (error) { alert('Error updating product: ' + error.message) }
    else { setProducts(prev => prev.map(p => p.id === productId ? { ...p, sold_out: !current } : p)) }
    setTogglingProduct(null)
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingOrder(orderId)
    const res = await authedFetch('/api/designer/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, status: newStatus }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Failed to update status: ' + (err.error ?? res.statusText))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
    setUpdatingOrder(null)
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  }

  const activeOrders = orders.filter(o => o.status !== 'cancelled')
  const totalRevenue = activeOrders.reduce((sum, o) => {
    return sum + o.order_items
      .filter(item => products.some(p => p.id === item.product_id))
      .reduce((s, item) => s + item.price * item.quantity, 0)
  }, 0)
  const totalItemsSold = activeOrders.reduce((sum, o) => {
    return sum + o.order_items
      .filter(item => products.some(p => p.id === item.product_id))
      .reduce((s, item) => s + item.quantity, 0)
  }, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-violet-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Designer Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link href="/designer/upload" className="btn-primary flex items-center gap-2 text-sm">
            <Upload size={16} /> Upload Product
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{products.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeOrders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Items Sold</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalItemsSold}</p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
          <p className="text-sm text-violet-600">Total Revenue</p>
          <p className="text-3xl font-bold text-violet-700 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* My Products */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-violet-600" />
            <h2 className="text-lg font-bold text-gray-900">My Products</h2>
            <span className="badge bg-violet-100 text-violet-700">{products.length}</span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Package size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No products yet</p>
              <Link href="/designer/upload" className="btn-primary mt-4 inline-block text-sm">
                Upload your first product
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.image_url} alt={p.name} className="object-cover w-full h-full" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${p.id}`} className="font-semibold text-gray-900 hover:text-violet-600 truncate block">
                      {p.name}
                    </Link>
                    <p className="text-xs text-gray-500 capitalize">{p.category} · ₹{p.price.toLocaleString('en-IN')}</p>
                  </div>
                  <button
                    onClick={() => toggleSoldOut(p.id, p.sold_out)}
                    disabled={togglingProduct === p.id}
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                      p.sold_out
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {togglingProduct === p.id ? '…' : p.sold_out ? 'Sold Out' : 'In Stock'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={18} className="text-violet-600" />
            <h2 className="text-lg font-bold text-gray-900">Orders</h2>
            <span className="badge bg-violet-100 text-violet-700">{orders.length}</span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <TrendingUp size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here when customers buy your products</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const myItems = order.order_items.filter(item => products.some(p => p.id === item.product_id))
                return (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-mono truncate">{order.id}</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">
                          {order.profiles?.full_name ?? 'Customer'} ·{' '}
                          {new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`badge text-xs ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'} capitalize`}>
                          {order.status}
                        </span>
                        {order.status !== 'cancelled' && (
                          <select
                            value={order.status}
                            disabled={updatingOrder === order.id}
                            onChange={e => updateStatus(order.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white cursor-pointer"
                          >
                            <option value="pending">pending</option>
                            <option value="shipped">shipped</option>
                            <option value="delivered">delivered</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {myItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600">
                          <span>{item.products?.name ?? 'Product'} × {item.quantity}</span>
                          <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
