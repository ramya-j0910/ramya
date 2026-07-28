import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// POST /api/tryon
// Body: { model_image: string (base64 data URL), garment_image: string (URL) }
export async function POST(request: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Try-on service not configured' }, { status: 503 })
  }

  const { model_image, garment_image } = await request.json()
  if (!model_image || !garment_image) {
    return NextResponse.json({ error: 'Missing model_image or garment_image' }, { status: 400 })
  }

  // Step 1: Create prediction using fashn/tryon on Replicate
  const createRes = await fetch('https://api.replicate.com/v1/models/fashn/tryon/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=55',
    },
    body: JSON.stringify({
      input: {
        model_image,
        garment_image,
        category: 'tops',
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    return NextResponse.json({ error: 'Replicate API error: ' + err }, { status: createRes.status })
  }

  const prediction = await createRes.json()

  // Replicate may return synchronously if Prefer: wait worked
  if (prediction.status === 'succeeded') {
    const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    return NextResponse.json({ image_url: output })
  }

  if (prediction.status === 'failed' || prediction.error) {
    return NextResponse.json({ error: prediction.error ?? 'Prediction failed' }, { status: 500 })
  }

  // Step 2: Poll until done (max ~50s)
  const predictionId = prediction.id
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!pollRes.ok) continue

    const pollData = await pollRes.json()

    if (pollData.status === 'succeeded') {
      const output = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output
      return NextResponse.json({ image_url: output })
    }

    if (pollData.status === 'failed') {
      return NextResponse.json({ error: pollData.error ?? 'Prediction failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Try-on timed out — please try again' }, { status: 504 })
}
