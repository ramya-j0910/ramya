import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const SPACE = 'https://yisol-idm-vton.hf.space'

// POST /api/tryon
// Body: { model_image: string (base64 data URL), garment_image: string (URL), garment_name: string }
// Uses the official IDM-VTON HF Space — completely free
export async function POST(request: NextRequest) {
  const { model_image, garment_image, garment_name } = await request.json()
  if (!model_image || !garment_image) {
    return NextResponse.json({ error: 'Missing model_image or garment_image' }, { status: 400 })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const hfToken = process.env.HF_TOKEN
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`

  // Step 1: Submit — /call/tryon
  // First param (dict) is the human image in Imageeditor format
  // Second param is the garment image (plain URL or base64)
  const submitRes = await fetch(`${SPACE}/call/tryon`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: [
        { background: { path: model_image, url: model_image }, layers: [], composite: null },
        { path: garment_image, url: garment_image },
        garment_name ?? 'fashion garment',
        true,   // is_checked (auto-masking)
        false,  // is_checked_crop
        30,     // denoise_steps
        42,     // seed
      ],
    }),
  })

  if (!submitRes.ok) {
    const text = await submitRes.text()
    return NextResponse.json({ error: 'Space error: ' + text }, { status: submitRes.status })
  }

  const { event_id } = await submitRes.json()
  if (!event_id) {
    return NextResponse.json({ error: 'No event_id returned' }, { status: 500 })
  }

  // Step 2: Poll result stream — /call/tryon/{event_id}
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const resultRes = await fetch(`${SPACE}/call/tryon/${event_id}`, { headers })
    if (!resultRes.ok) continue

    const text = await resultRes.text()

    // SSE stream — look for "event: complete" then parse data line
    if (text.includes('event: complete') || text.includes('event:complete')) {
      // Extract the data line after the complete event
      const lines = text.split('\n')
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].includes('event: complete') || lines[j].includes('event:complete')) {
          // next non-empty line should be data:
          for (let k = j + 1; k < lines.length; k++) {
            const line = lines[k].trim()
            if (line.startsWith('data:')) {
              try {
                const parsed = JSON.parse(line.slice(5).trim())
                // parsed is an array; first element is the output image
                const first = Array.isArray(parsed) ? parsed[0] : parsed
                const imageUrl = typeof first === 'string' ? first : (first?.url ?? first?.path)
                if (imageUrl) return NextResponse.json({ image_url: imageUrl })
              } catch { /* keep trying */ }
            }
          }
        }
      }
    }

    if (text.includes('event: error') || text.includes('event:error')) {
      return NextResponse.json({ error: 'Generation failed on server' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Try-on timed out — please try again' }, { status: 504 })
}
