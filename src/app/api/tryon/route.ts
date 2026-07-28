import { NextRequest, NextResponse } from 'next/server'

// POST /api/tryon
// Body: { model_image: string (base64 data URL), garment_image: string (URL) }
// Uses Fashn.ai /run endpoint — returns a result image URL
export async function POST(request: NextRequest) {
  const apiKey = process.env.FASHN_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Try-on service not configured' }, { status: 503 })
  }

  const { model_image, garment_image } = await request.json()
  if (!model_image || !garment_image) {
    return NextResponse.json({ error: 'Missing model_image or garment_image' }, { status: 400 })
  }

  // Step 1: Start the prediction
  const runRes = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_image,
      garment_image,
      category: 'tops',   // fashn.ai: tops | bottoms | one-pieces
      mode: 'balanced',
    }),
  })

  if (!runRes.ok) {
    const text = await runRes.text()
    return NextResponse.json({ error: `Try-on API error: ${text}` }, { status: runRes.status })
  }

  const { id: predictionId } = await runRes.json()
  if (!predictionId) {
    return NextResponse.json({ error: 'No prediction ID returned' }, { status: 500 })
  }

  // Step 2: Poll until completed (max ~60s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const statusRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!statusRes.ok) continue

    const statusData = await statusRes.json()

    if (statusData.status === 'completed') {
      const output = statusData.output
      const imageUrl = Array.isArray(output) ? output[0] : output
      return NextResponse.json({ image_url: imageUrl })
    }

    if (statusData.status === 'failed') {
      return NextResponse.json({ error: statusData.error ?? 'Try-on generation failed' }, { status: 500 })
    }
    // still processing — keep polling
  }

  return NextResponse.json({ error: 'Try-on timed out — please try again' }, { status: 504 })
}
