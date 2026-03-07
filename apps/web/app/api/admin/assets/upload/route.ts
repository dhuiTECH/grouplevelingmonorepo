import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

const BUCKET = 'game-assets'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error ?? 'Unauthorized', details: 'Admin authentication required' },
        { status: auth.status ?? 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const prefix = formData.get('prefix') || 'uploads'

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided', details: 'Include a file in the "file" field' },
        { status: 400 }
      )
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${prefix}/${Date.now()}_${sanitizedName}`

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, file, { 
        upsert: true, 
        contentType: file.type || undefined,
        cacheControl: '31536000'
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        {
          error: 'Storage upload failed',
          details: error.message
        },
        { status: 500 }
      )
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    return NextResponse.json({
      path: publicUrl,
      url: publicUrl,
      publicUrl
    })
  } catch (err: any) {
    console.error('Upload API error:', err)
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: err?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
