'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { ShoppingBag, Heart, Package, Upload, LogIn, LogOut, User } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="text-2xl font-bold text-violet-600 tracking-tight">
            Vestique
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-violet-600 transition-colors">
              Catalog
            </Link>
            {user && (
              <>
                <Link href="/wishlist" className="flex items-center gap-1 text-sm text-gray-600 hover:text-violet-600 transition-colors">
                  <Heart size={16} /> Wishlist
                </Link>
                <Link href="/cart" className="flex items-center gap-1 text-sm text-gray-600 hover:text-violet-600 transition-colors">
                  <ShoppingBag size={16} /> Cart
                </Link>
                <Link href="/orders" className="flex items-center gap-1 text-sm text-gray-600 hover:text-violet-600 transition-colors">
                  <Package size={16} /> Orders
                </Link>
                {profile?.role === 'designer' && (
                  <Link href="/designer/upload" className="flex items-center gap-1 text-sm text-gray-600 hover:text-violet-600 transition-colors">
                    <Upload size={16} /> Upload
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-500 transition-colors"
                >
                  <LogOut size={16} /> Sign out
                </button>
                <span className="flex items-center gap-1 text-sm font-medium text-violet-700">
                  <User size={16} />
                  {profile?.full_name?.split(' ')[0] ?? 'Account'}
                </span>
              </>
            )}
            {!user && (
              <Link href="/login" className="btn-primary text-sm">
                <span className="flex items-center gap-1"><LogIn size={16} /> Sign in</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">Catalog</Link>
          {user && (
            <>
              <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">Wishlist</Link>
              <Link href="/cart" onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">Cart</Link>
              <Link href="/orders" onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">Orders</Link>
              {profile?.role === 'designer' && (
                <Link href="/designer/upload" onClick={() => setMenuOpen(false)} className="text-sm text-gray-700">Upload Product</Link>
              )}
              <button onClick={() => { signOut(); setMenuOpen(false) }} className="text-sm text-red-500 text-left">Sign out</button>
            </>
          )}
          {!user && (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-primary text-sm w-fit">Sign in</Link>
          )}
        </div>
      )}
    </nav>
  )
}
