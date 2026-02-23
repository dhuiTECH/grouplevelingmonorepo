import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const DAILY_LIMIT = 3

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const hunterId = user.id
  const formData = await request.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const { count, error: countError } = await supabaseAdmin
    .from('food_scanner_usage')
    .select('*', { count: 'exact', head: true })
    .eq('hunter_id', hunterId)
    .gte('used_at', todayStart.toISOString())
    .lt('used_at', todayEnd.toISOString())

  if (countError) {
    console.error('food_scanner_usage count error:', countError)
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 })
  }

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({
      error: 'Daily limit reached',
      details: `You can only use the AI food scanner ${DAILY_LIMIT} times per day. Try again tomorrow.`,
      used: count ?? 0,
      limit: DAILY_LIMIT,
    }, { status: 429 })
  }

  const bytes = await file.arrayBuffer()
  const base64Image = Buffer.from(bytes).toString('base64')
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const prompt = `
Analyze this image and identify the food or meal shown. Extract nutrition information in JSON format:

{
  "name": "string (short food/meal name, e.g. GRILLED CHICKEN & RICE)",
  "calories": number (estimated total calories),
  "protein": number (grams),
  "carbs": number (grams),
  "fats": number (grams)
}

Rules:
- Identify the main food or meal visible. If multiple items, estimate for the whole plate/meal.
- Use reasonable estimates for macros if not visible (e.g. typical values for that food).
- Return valid JSON only. Numbers must be integers.
`

  let result
  try {
    result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Image,
        },
      },
    ])
  } catch (geminiError: any) {
    console.error('Gemini API Error:', geminiError)
    if (geminiError.status === 404) {
      return NextResponse.json({
        error: 'AI Model Not Found',
        details: 'The AI model is not available. Please try again later.',
      }, { status: 503 })
    }
    if (geminiError.status === 429) {
      return NextResponse.json({
        error: 'AI Rate Limit Exceeded',
        details: 'Too many requests. Please wait a moment and try again.',
      }, { status: 429 })
    }
    if (geminiError.message?.includes('quota') || geminiError.message?.includes('billing')) {
      return NextResponse.json({
        error: 'AI Quota Exceeded',
        details: 'AI service quota reached. Please try again later.',
      }, { status: 402 })
    }
    return NextResponse.json({
      error: 'AI Processing Error',
      details: 'Failed to analyze image. Please try again with a clearer photo.',
    }, { status: 500 })
  }

  const response = await result.response
  const text = response.text()

  let analysis: { name?: string; calories?: number; protein?: number; carbs?: number; fats?: number }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in Gemini response:', text)
      return NextResponse.json({
        error: 'AI Response Error',
        details: 'Could not read food from image. Please try again.',
      }, { status: 502 })
    }
    analysis = JSON.parse(jsonMatch[0])
  } catch (parseError) {
    console.error('Parse error:', parseError)
    return NextResponse.json({
      error: 'AI Analysis Error',
      details: 'Could not process AI response. Please try again.',
    }, { status: 502 })
  }

  const name = (analysis.name || 'Unknown food').toString().trim().toUpperCase()
  const calories = Math.round(Number(analysis.calories) || 0)
  const protein = Math.round(Number(analysis.protein) || 0)
  const carbs = Math.round(Number(analysis.carbs) || 0)
  const fats = Math.round(Number(analysis.fats) || 0)

  const { error: insertError } = await supabaseAdmin
    .from('food_scanner_usage')
    .insert({ hunter_id: hunterId })

  if (insertError) {
    console.error('food_scanner_usage insert error:', insertError)
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }

  return NextResponse.json({
    name,
    calories,
    protein,
    carbs,
    fats,
  })
}
