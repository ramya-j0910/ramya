'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch, Order } from '@/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    authedFetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
  }, [user, authLoading, router])

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
                <div className="flex items-center gap-4">
                  <p className="font-bold text-violet-700 text-lg">₹{order.total.toLocaleString('en-IN')}</p>
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
