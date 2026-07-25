'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, Upload, TrendingUp } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, Product } from '@/lib/supabase'

type OrderItem = {
  quantity: number
  price: number
  orders: {
    id: string
    status: string
    created_at: string
    profiles: { full_name: string | null }
  }
  products: { name: string; id: string }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
}

export default function DesignerDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile && profile.role !== 'designer') { router.push('/'); return }
    if (!profile) return

    async function load() {
      // Load designer's products
      const { data: prods, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('designer_id', user!.id)
        .order('created_at', { ascending: false })

      if (prodError) { alert('Error loading products: ' + prodError.message); return }
      setProducts((prods as Product[]) ?? [])

      if (!prods || prods.length === 0) { setLoading(false); return }

      // Load orders that contain this designer's products
      const productIds = prods.map((p: Product) => p.id)
      const { data: items, error: ordersError } = await supabase
        .from('order_items')
        .select('quantity, price, products(id, name), orders(id, status, created_at, profiles(full_name))')
        .in('product_id', productIds)
        .order('orders(created_at)', { ascending: false })

      if (ordersError) { alert('Error loading orders: ' + ordersError.message); return }
      setOrderItems((items as unknown as OrderItem[]) ?? [])
      setLoading(false)
    }

    load()
  }, [user, profile, authLoading, router])

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingOrder(orderId)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    if (error) alert('Failed to update status: ' + error.message)
    else {
      setOrderItems(prev => prev.map(item =>
        item.orders.id === orderId
          ? { ...item, orders: { ...item.orders, status: newStatus } }
          : item
      ))
    }
    setUpdatingOrder(null)
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  }

  const totalRevenue = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalOrders = new Set(orderItems.map(i => i.orders.id)).size

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-violet-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Designer Dashboard</h1>
        </div>
        <Link href="/designer/upload" className="btn-primary flex items-center gap-2 text-sm">
          <Upload size={16} /> Upload Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{products.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Items Sold</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {orderItems.reduce((sum, i) => sum + i.quantity, 0)}
          </p>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
          <p className="text-sm text-violet-600">Total Revenue</p>
          <p className="text-3xl font-bold text-violet-700 mt-1">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
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
                    <p className="text-xs text-gray-500 capitalize">{p.category}</p>
                  </div>
                  <p className="font-bold text-violet-700 text-sm flex-shrink-0">
                    ₹{p.price.toLocaleString('en-IN')}
                  </p>
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
            <span className="badge bg-violet-100 text-violet-700">{totalOrders}</span>
          </div>

          {orderItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <TrendingUp size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here when customers buy your products</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orderItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.products.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Customer: {item.orders.profiles?.full_name ?? 'Unknown'} ·
                        Qty: {item.quantity} ·
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {new Date(item.orders.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`badge text-xs ${STATUS_COLORS[item.orders.status] ?? 'bg-gray-100 text-gray-700'} capitalize`}>
                        {item.orders.status}
                      </span>
                      <select
                        value={item.orders.status}
                        disabled={updatingOrder === item.orders.id}
                        onChange={e => updateStatus(item.orders.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white cursor-pointer"
                      >
                        <option value="pending">pending</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
