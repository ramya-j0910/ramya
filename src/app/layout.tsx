import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vestique — Fashion for Everyone',
  description: 'Discover curated fashion from independent designers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 mt-16 py-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Vestique. Crafted with love for fashion.
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
