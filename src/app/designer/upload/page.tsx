'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload, ImageIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Sarees', 'Kurtas', 'Lehengas', 'Gowns', 'Dresses', 'Tops', 'Co-ords', 'Other']

export default function DesignerUploadPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Sarees')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    if (profile && profile.role !== 'designer') { router.push('/'); return }
  }, [user, profile, authLoading, router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    let image_url: string | null = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${user!.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, imageFile, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`)
        setSubmitting(false)
        return
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
      image_url = urlData.publicUrl
    }

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price: parseFloat(price), category, image_url }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to create product')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push(`/product/${data.id}`), 2000)
  }

  if (authLoading || !profile) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading…</div>
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center bg-green-50 border border-green-200 rounded-2xl p-12 max-w-md">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Product Published!</h2>
          <p className="text-green-600">Redirecting to product page…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Upload className="text-violet-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">Upload Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Image upload */}
        <div>
          <label className="label">Product Image</label>
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-violet-300">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">Click to change</p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors">
                <ImageIcon size={40} className="mb-2" />
                <p className="text-sm">Click to upload image</p>
                <p className="text-xs mt-1">JPG, PNG, WEBP up to 5MB</p>
              </div>
            )}
          </label>
        </div>

        <div>
          <label className="label">Product Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="e.g. Banarasi Silk Saree"
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input resize-none"
            rows={4}
            placeholder="Describe the product, material, sizing, care instructions…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Price (₹) *</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="input"
              placeholder="2499"
              min="1"
              step="1"
              required
            />
          </div>
          <div>
            <label className="label">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? 'Publishing…' : 'Publish Product'}
        </button>
      </form>
    </div>
  )
}
