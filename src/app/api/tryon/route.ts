import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// POST /api/tryon
// Body: { model_image: string (base64 data URL), garment_image: string (URL), garment_name: string }
// Uses the official IDM-VTON Hugging Face Space (free, no API key needed)
export async function POST(request: NextRequest) {
  const { model_image, garment_image, garment_name } = await request.json()
  if (!model_image || !garment_image) {
    return NextResponse.json({ error: 'Missing model_image or garment_image' }, { status: 400 })
  }

  const HF_TOKEN = process.env.HF_TOKEN ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (HF_TOKEN) headers['Authorization'] = `Bearer ${HF_TOKEN}`

  // Step 1: Submit job to the IDM-VTON Gradio Space
  const submitRes = await fetch(
    'https://yisol-idm-vton.hf.space/gradio_api/queue/join',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: [
          { path: garment_image, url: garment_image },   // garm_img
          { path: model_image, url: model_image },        // human_img
          garment_name ?? 'fashion garment',              // garment_des
          true,                                           // is_checked
          false,                                          // is_checked_crop
          30,                                             // denoise_steps
          42,                                             // seed
        ],
        event_data: null,
        fn_index: 0,
        session_hash: Math.random().toString(36).slice(2),
      }),
    }
  )

  if (!submitRes.ok) {
    const text = await submitRes.text()
    return NextResponse.json({ error: 'Space submit error: ' + text }, { status: submitRes.status })
  }

  const { event_id } = await submitRes.json()
  if (!event_id) {
    return NextResponse.json({ error: 'No event_id returned from Space' }, { status: 500 })
  }

  // Step 2: Poll the status endpoint until complete
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const statusRes = await fetch(
      `https://yisol-idm-vton.hf.space/gradio_api/queue/status?event_id=${event_id}`,
      { headers }
    )

    if (!statusRes.ok) continue

    const statusData = await statusRes.json()

    if (statusData.status === 'COMPLETE') {
      // output is array; first element is the result image
      const output = statusData.output?.data?.[0]
      const imageUrl = typeof output === 'string' ? output : output?.url
      if (!imageUrl) {
        return NextResponse.json({ error: 'No output image returned' }, { status: 500 })
      }
      return NextResponse.json({ image_url: imageUrl })
    }

    if (statusData.status === 'FAILED') {
      return NextResponse.json({ error: statusData.error ?? 'Generation failed' }, { status: 500 })
    }
    // statuses: PENDING, IN_QUEUE, IN_PROGRESS — keep polling
  }

  return NextResponse.json({ error: 'Try-on timed out — please try again' }, { status: 504 })
}
