import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const SPACE = 'https://yisol-idm-vton.hf.space'

// POST /api/tryon
// Body: { model_image: string (base64 data URL), garment_image: string (URL), garment_name: string }
// Requires HF_TOKEN env var — free HuggingFace token (huggingface.co/settings/tokens)
export async function POST(request: NextRequest) {
  const hfToken = process.env.HF_TOKEN
  if (!hfToken) {
    return NextResponse.json(
      { error: 'HF_TOKEN not configured — see setup instructions' },
      { status: 503 }
    )
  }

  const { model_image, garment_image, garment_name } = await request.json()
  if (!model_image || !garment_image) {
    return NextResponse.json({ error: 'Missing model_image or garment_image' }, { status: 400 })
  }

  const authHeaders: Record<string, string> = { Authorization: `Bearer ${hfToken}` }

  // Step 1: Upload person photo as binary to Space /upload endpoint
  const matches = model_image.match(/^data:(.+);base64,(.+)$/)
  if (!matches) {
    return NextResponse.json({ error: 'Invalid model_image format' }, { status: 400 })
  }
  const mimeType = matches[1]
  const binaryData = Buffer.from(matches[2], 'base64')

  const formData = new FormData()
  formData.append('files', new Blob([binaryData], { type: mimeType }), 'person.jpg')

  const uploadRes = await fetch(`${SPACE}/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    return NextResponse.json({ error: 'Upload failed: ' + text }, { status: uploadRes.status })
  }

  const uploadedPaths: string[] = await uploadRes.json()
  const personPath = uploadedPaths[0]
  if (!personPath) {
    return NextResponse.json({ error: 'No uploaded path returned' }, { status: 500 })
  }

  // Step 2: Submit try-on job
  const meta = { _type: 'gradio.FileData' }
  const submitRes = await fetch(`${SPACE}/call/tryon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      data: [
        {
          background: { path: personPath, url: `${SPACE}/file=${personPath}`, orig_name: 'person.jpg', meta },
          layers: [],
          composite: null,
        },
        { path: garment_image, url: garment_image, orig_name: 'garment.jpg', meta },
        garment_name ?? 'fashion garment',
        true,
        false,
        30,
        42,
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

  // Step 3: Poll SSE result
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const resultRes = await fetch(`${SPACE}/call/tryon/${event_id}`, { headers: authHeaders })
    if (!resultRes.ok) continue

    const text = await resultRes.text()

    if (text.includes('event: error')) {
      return NextResponse.json(
        { error: 'The try-on model could not process these images. Tips: use a clear full-body front-facing photo, plain background, good lighting. Then try again.' },
        { status: 500 }
      )
    }

    if (text.includes('event: complete')) {
      const lines = text.split('\n')
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].includes('event: complete')) {
          for (let k = j + 1; k < lines.length; k++) {
            const line = lines[k].trim()
            if (line.startsWith('data:')) {
              try {
                const parsed = JSON.parse(line.slice(5).trim())
                const first = Array.isArray(parsed) ? parsed[0] : parsed
                const imageUrl = typeof first === 'string'
                  ? first
                  : (first?.url ?? (first?.path ? `${SPACE}/file=${first.path}` : null))
                if (imageUrl) return NextResponse.json({ image_url: imageUrl })
              } catch { /* keep trying */ }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ error: 'Try-on timed out — please try again' }, { status: 504 })
}
