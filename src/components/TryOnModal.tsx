'use client'

import { useState, useRef } from 'react'
import { X, Upload, Sparkles, Download } from 'lucide-react'

interface TryOnModalProps {
  garmentImageUrl: string
  garmentName: string
  onClose: () => void
}

type Stage = 'upload' | 'generating' | 'result' | 'error'

export default function TryOnModal({ garmentImageUrl, garmentName, onClose }: TryOnModalProps) {
  const [stage, setStage] = useState<Stage>('upload')
  const [personPreview, setPersonPreview] = useState<string | null>(null)
  const [personBase64, setPersonBase64] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image must be under 5 MB')
      setStage('error')
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setPersonPreview(dataUrl)
      setPersonBase64(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  async function generate() {
    if (!personBase64) return
    setStage('generating')
    setErrorMsg('')

    try {
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_image: personBase64,
          garment_image: garmentImageUrl,
          garment_name: garmentName,
        }),
      })

      const data = await res.json()

      // ZeroGPU space blocks free API calls — open the space directly for the user
      if (res.status === 403 && data.error === 'ZEROGPU_BLOCKED') {
        window.open('https://huggingface.co/spaces/yisol/IDM-VTON', '_blank')
        setErrorMsg('The free try-on AI requires you to run it directly on HuggingFace. We\'ve opened the page for you — upload your photo and the garment image there.')
        setStage('error')
        return
      }

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStage('error')
        return
      }

      setResultUrl(data.image_url)
      setStage('result')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStage('error')
    }
  }

  function reset() {
    setStage('upload')
    setPersonPreview(null)
    setPersonBase64(null)
    setResultUrl(null)
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">👗 Virtual Try-On</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{garmentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* Upload stage */}
          {(stage === 'upload') && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Person photo */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Photo</p>
                  {/* Hidden file input — triggered programmatically to avoid flash */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {personPreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-violet-300 cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={personPreview} alt="Your photo" className="object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-medium">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 hover:border-violet-400 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-violet-500 cursor-pointer"
                    >
                      <Upload size={28} className="mb-2" />
                      <p className="text-sm font-medium">Upload your photo</p>
                      <p className="text-xs mt-1">Full body, front-facing</p>
                    </div>
                  )}
                </div>

                {/* Garment */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Garment</p>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={garmentImageUrl} alt={garmentName} className="object-cover w-full h-full" />
                  </div>
                </div>
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-700 space-y-1">
                <p className="font-medium">Tips for best results:</p>
                <ul className="list-disc list-inside space-y-0.5 text-violet-600">
                  <li>Use a clear, front-facing full-body photo</li>
                  <li>Plain background works best</li>
                  <li>Well-lit, high-resolution image</li>
                </ul>
              </div>

              <button
                onClick={generate}
                disabled={!personBase64}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-40"
              >
                <Sparkles size={18} />
                Generate Try-On
              </button>
            </div>
          )}

          {/* Generating stage */}
          {stage === 'generating' && (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mb-6" />
              <p className="text-lg font-semibold text-gray-800">Generating your look…</p>
              <p className="text-sm text-gray-500 mt-2">This takes about 20–40 seconds</p>
              <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-xs opacity-40">
                <div className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
                <div className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>
          )}

          {/* Result stage */}
          {stage === 'result' && resultUrl && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2 text-center">Original</p>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={personPreview!} alt="Original" className="object-cover w-full h-full" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-violet-600 mb-2 text-center">✨ Try-On Result</p>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-violet-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resultUrl} alt="Try-on result" className="object-cover w-full h-full" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={resultUrl}
                  download="tryon-result.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Save Image
                </a>
                <button onClick={reset} className="btn-secondary flex-1">
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Error stage */}
          {stage === 'error' && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X size={24} className="text-red-500" />
              </div>
              <p className="text-lg font-semibold text-gray-800">Something went wrong</p>
              <p className="text-sm text-red-500 mt-2 max-w-sm">{errorMsg}</p>
              <button onClick={reset} className="btn-primary mt-6">Try Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
