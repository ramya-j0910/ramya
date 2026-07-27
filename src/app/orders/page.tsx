'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, authedFetch, Order } from '@/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      setOrders((data as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [user, authLoading, router])

  async function cancelOrder(orderId: string) {
    if (!confirm('Cancel this order?')) return
    setCancelling(orderId)
    const res = await authedFetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Failed to cancel: ' + (err.error ?? res.statusText))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    }
    setCancelling(null)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(id)) { s.delete(id) } else { s.add(id) }
      return s
    })
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Package className="text-violet-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <span className="badge bg-violet-100 text-violet-700">{orders.length}</span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 text-lg">No orders yet</p>
          <Link href="/" className="btn-primary mt-6 inline-block">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(order.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className={`badge ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'} capitalize`}>
                    {order.status}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Order · {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-violet-700 text-lg">₹{order.total.toLocaleString('en-IN')}</p>
                  {order.status === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); cancelOrder(order.id) }}
                      disabled={cancelling === order.id}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors font-medium"
                    >
                      <XCircle size={13} />
                      {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                  {expanded.has(order.id) ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expanded.has(order.id) && order.order_items && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                        <th className="pb-2">Product</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {order.order_items!.map(item => (
                        <tr key={item.product_id}>
                          <td className="py-2 text-gray-700">
                            <Link href={`/product/${item.product_id}`} className="hover:text-violet-600">
                              {item.products?.name ?? 'Product'}
                            </Link>
                          </td>
                          <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-2 text-right text-gray-600">₹{item.price.toLocaleString('en-IN')}</td>
                          <td className="py-2 text-right font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
