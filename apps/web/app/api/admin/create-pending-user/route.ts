import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { name, avatar, email, strava_id } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    console.log('Creating pending user:', { name, avatar, email, strava_id })

    // Check for duplicates before creating
    const duplicateChecks = {
      name: null as any,
      email: null as any,
      strava_id: null as any
    }

    // Check name
    const { data: nameUser } = await supabaseAdmin
      .from('users')
      .select('id, name, email, strava_id, status')
      .eq('name', name.trim())
      .single()
    
    if (nameUser) {
      duplicateChecks.name = nameUser
    }

    // Check email (if provided)
    if (email && email.trim()) {
      const { data: emailUser } = await supabaseAdmin
        .from('users')
        .select('id, name, email, strava_id, status')
        .eq('email', email.trim())
        .single()
      
      if (emailUser) {
        duplicateChecks.email = emailUser
      }
    }

    // Check strava_id (if provided)
    if (strava_id) {
      const { data: stravaUser } = await supabaseAdmin
        .from('users')
        .select('id, name, email, strava_id, status')
        .eq('strava_id', strava_id)
        .single()
      
      if (stravaUser) {
        duplicateChecks.strava_id = stravaUser
      }
    }

    // Check if any duplicates found
    const duplicates = Object.entries(duplicateChecks)
      .filter(([_, user]) => user !== null)
      .map(([field, user]) => ({ field, user }))

    if (duplicates.length > 0) {
      const duplicateFields = duplicates.map(d => d.field).join(', ')
      const duplicateUser = duplicates[0].user
      
      let message = `User already exists with the same ${duplicateFields.replace(/_/g, ' ')}.\n\n`
      message += `Existing User:\n`
      message += `• Name: ${duplicateUser.name}\n`
      if (duplicateUser.email) message += `• Email: ${duplicateUser.email}\n`
      if (duplicateUser.strava_id) message += `• Strava ID: ${duplicateUser.strava_id}\n`
      message += `• Status: ${duplicateUser.status}\n\n`
      message += `Please use different ${duplicateFields.replace(/_/g, ' ')} or update the existing user.`

      return NextResponse.json({ 
        error: 'Duplicate user detected',
        message: message,
        duplicateFields: duplicateFields.split(', '),
        existingUser: duplicateUser
      }, { status: 409 })
    }

    // Create user with null auth_user_id (will be set when they properly authenticate)
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: null, // No auth yet - admin will handle this
        name: name.trim(),
        avatar: avatar || '/NoobMan.png',
        email: email?.trim() || null,
        strava_id: strava_id || null,
        status: 'pending',
        is_admin: false
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating pending user:', userError)
      
      // Check if it's a unique constraint violation
      if (userError.code === '23505') {
        const constraint = userError.message.match(/Key \(([^)]+)\)/)?.[1] || 'field'
        return NextResponse.json({ 
          error: 'Duplicate user detected',
          message: `A user with the same ${constraint} already exists.`,
          details: userError.message
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create user',
        details: userError.message
      }, { status: 500 })
    }

    console.log('✅ Created pending user:', newUser)

    let successMessage = `User "${newUser.name}" created successfully!\n\n`
    successMessage += `Details:\n`
    successMessage += `• Name: ${newUser.name}\n`
    if (newUser.email) successMessage += `• Email: ${newUser.email}\n`
    if (newUser.strava_id) successMessage += `• Strava ID: ${newUser.strava_id}\n`
    successMessage += `• Status: ${newUser.status}\n`

    return NextResponse.json({
      success: true,
      user: newUser,
      message: successMessage
    })

  } catch (error) {
    console.error('Error in create-pending-user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




