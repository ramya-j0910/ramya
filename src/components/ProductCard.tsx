'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Product } from '@/lib/supabase'

interface ProductCardProps {
  product: Product
  wishlisted?: boolean
  onWishlist?: (productId: string) => void
}

export default function ProductCard({ product, wishlisted, onWishlist }: ProductCardProps) {
  return (
    <div className="card group">
      <Link href={`/product/${product.id}`}>
        <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm">
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/product/${product.id}`}>
              <p className="font-semibold text-gray-900 truncate hover:text-violet-600 transition-colors">
                {product.name}
              </p>
            </Link>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{product.category}</p>
          </div>
          {onWishlist && (
            <button
              onClick={() => onWishlist(product.id)}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-violet-50 transition-colors"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                size={18}
                className={wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}
              />
            </button>
          )}
        </div>
        <p className="mt-2 font-bold text-violet-700">₹{product.price.toLocaleString('en-IN')}</p>
      </div>
    </div>
  )
}
