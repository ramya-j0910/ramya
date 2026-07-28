'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, Download, ZoomIn, ZoomOut, Move } from 'lucide-react'

interface TryOnModalProps {
  garmentImageUrl: string
  garmentName: string
  onClose: () => void
}

export default function TryOnModal({ garmentImageUrl, garmentName, onClose }: TryOnModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [personImage, setPersonImage] = useState<HTMLImageElement | null>(null)
  const [garmentImage, setGarmentImage] = useState<HTMLImageElement | null>(null)
  const [personPreview, setPersonPreview] = useState<string | null>(null)
  const [stage, setStage] = useState<'upload' | 'preview'>('upload')

  // Garment overlay controls
  const [scale, setScale] = useState(0.55)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [opacity, setOpacity] = useState(0.92)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Load garment image on mount
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setGarmentImage(img)
    img.src = garmentImageUrl
  }, [garmentImageUrl])

  // Draw canvas whenever anything changes
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !personImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = personImage.width
    canvas.height = personImage.height

    // Draw person
    ctx.drawImage(personImage, 0, 0)

    // Draw garment overlay centered + offset
    if (garmentImage) {
      const gw = garmentImage.width * scale
      const gh = garmentImage.height * scale
      const cx = (canvas.width - gw) / 2 + offsetX
      const cy = canvas.height * 0.18 + offsetY  // start ~18% from top (chest area)

      ctx.globalAlpha = opacity
      ctx.drawImage(garmentImage, cx, cy, gw, gh)
      ctx.globalAlpha = 1
    }
  }, [personImage, garmentImage, scale, offsetX, offsetY, opacity])

  useEffect(() => { draw() }, [draw])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPersonPreview(url)
    const img = new Image()
    img.onload = () => {
      setPersonImage(img)
      setStage('preview')
    }
    img.src = url
  }

  // Drag to reposition garment
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging || !dragStart.current) return
    const ratio = canvasRef.current
      ? canvasRef.current.offsetWidth / canvasRef.current.width
      : 1
    setOffsetX(dragStart.current.ox + (e.clientX - dragStart.current.x) / ratio)
    setOffsetY(dragStart.current.oy + (e.clientY - dragStart.current.y) / ratio)
  }
  function onMouseUp() { setDragging(false); dragStart.current = null }

  // Touch drag
  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    const t = e.touches[0]
    setDragging(true)
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offsetX, oy: offsetY }
  }
  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!dragging || !dragStart.current) return
    const t = e.touches[0]
    const ratio = canvasRef.current
      ? canvasRef.current.offsetWidth / canvasRef.current.width
      : 1
    setOffsetX(dragStart.current.ox + (t.clientX - dragStart.current.x) / ratio)
    setOffsetY(dragStart.current.oy + (t.clientY - dragStart.current.y) / ratio)
  }

  function download() {
    draw()
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'tryon.jpg'
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
  }

  function reset() {
    setStage('upload')
    setPersonImage(null)
    setPersonPreview(null)
    setScale(0.55)
    setOffsetX(0)
    setOffsetY(0)
    setOpacity(0.92)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">👗 Virtual Try-On</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{garmentName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">

          {/* Upload stage */}
          {stage === 'upload' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Person photo */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Photo</p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 hover:border-violet-400 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-violet-500 cursor-pointer"
                  >
                    <Upload size={28} className="mb-2" />
                    <p className="text-sm font-medium">Upload your photo</p>
                    <p className="text-xs mt-1">Full body works best</p>
                  </div>
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

              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-700">
                <p className="font-medium mb-1">Tips for best results:</p>
                <ul className="list-disc list-inside space-y-0.5 text-violet-600">
                  <li>Use a front-facing full-body photo</li>
                  <li>Plain background works best</li>
                  <li>After overlay appears, drag to reposition it</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview / AR stage */}
          {stage === 'preview' && (
            <div className="space-y-4">
              {/* Canvas */}
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-move select-none"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onMouseUp}
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                  <Move size={11} /> Drag garment to reposition
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-600 font-medium flex items-center gap-1">
                      <ZoomIn size={14} /> Size
                    </label>
                    <span className="text-xs text-gray-400">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0.2" max="1.2" step="0.01"
                    value={scale}
                    onChange={e => setScale(parseFloat(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-600 font-medium flex items-center gap-1">
                      <ZoomOut size={14} /> Opacity
                    </label>
                    <span className="text-xs text-gray-400">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0.3" max="1" step="0.01"
                    value={opacity}
                    onChange={e => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={download} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Download size={16} /> Save Image
                </button>
                <button onClick={reset} className="btn-secondary flex-1">
                  Change Photo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
