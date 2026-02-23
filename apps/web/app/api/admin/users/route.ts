import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch all users (pending and approved)
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    console.log('📋 Admin fetching users')

    // First, let's check if we can query the profiles table at all
    const { count: totalProfiles, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error checking profiles table:', countError)
      return NextResponse.json({ 
        error: 'Database connection error', 
        details: countError.message,
        code: countError.code
      }, { status: 500 })
    }

    console.log('📊 Total profiles in database:', totalProfiles)

    // Fetch pending users from profiles table
    const { data: pendingUsers, error: pendingError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingError) {
      console.error('❌ Error fetching pending users:', pendingError)
      return NextResponse.json({ 
        error: 'Failed to fetch pending users', 
        details: pendingError.message,
        code: pendingError.code
      }, { status: 500 })
    }

    console.log('📋 Pending users found:', pendingUsers?.length || 0)
    if (pendingUsers && pendingUsers.length > 0) {
      console.log('📋 Sample pending user:', {
        id: pendingUsers[0].id,
        hunter_name: pendingUsers[0].hunter_name,
        status: pendingUsers[0].status,
        email: pendingUsers[0].email
      })
    }

    // Fetch approved users from profiles table
    const { data: approvedUsers, error: approvedError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (approvedError) {
      console.error('❌ Error fetching approved users:', approvedError)
      return NextResponse.json({ 
        error: 'Failed to fetch approved users', 
        details: approvedError.message,
        code: approvedError.code
      }, { status: 500 })
    }

    console.log('✅ Approved users found:', approvedUsers?.length || 0)
    if (approvedUsers && approvedUsers.length > 0) {
      console.log('✅ Sample approved user:', {
        id: approvedUsers[0].id,
        hunter_name: approvedUsers[0].hunter_name,
        status: approvedUsers[0].status,
        email: approvedUsers[0].email
      })
    }

    console.log('✅ Users loaded - Pending:', pendingUsers?.length || 0, 'Approved:', approvedUsers?.length || 0)

    return NextResponse.json({
      pendingUsers: pendingUsers || [],
      approvedUsers: approvedUsers || []
    })

  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// PATCH - Update user (approve, reject, toggle admin)
export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { userId, action, value } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 })
    }

    console.log('📝 Admin action:', action, 'for user:', userId)

    let updateData: any = {}

    switch (action) {
      case 'approve':
        updateData = { status: 'approved' }
        // Profiles table already has exp, coins, level, hunter_rank, weekly_slots_used
        // No need to create separate user_progress - it's all in profiles now

        // Send approval email notification
        try {
          // Get user details first
          const { data: userData, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('hunter_name, email')
            .eq('id', userId)
            .single()

          if (!fetchError && userData?.email) {
            console.log('📧 Sending approval email to:', userData.email)

            // Send approval email using Resend
            try {
              if (process.env.RESEND_API_KEY) {
                const res = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'Hunter System <noreply@huntersystem.com>',
                    to: userData.email,
                    subject: '🎉 Hunter Access Granted!',
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); color: white; padding: 20px; border-radius: 10px;">
                        <h1 style="color: #00ffff; text-align: center; margin-bottom: 30px;">🎯 Welcome to the Hunt!</h1>
                        <div style="background: rgba(0, 255, 255, 0.1); padding: 20px; border-radius: 8px; border: 1px solid #00ffff;">
                          <h2 style="color: #00ffff; margin-top: 0;">Greetings, Hunter ${userData.hunter_name}!</h2>
                          <p style="font-size: 16px; line-height: 1.6;">Your application has been <strong style="color: #00ff00;">APPROVED</strong>!</p>
                          <p style="font-size: 16px; line-height: 1.6;">You now have full access to:</p>
                          <ul style="font-size: 16px; line-height: 1.8;">
                            <li>🏃‍♂️ Activity tracking and XP rewards</li>
                            <li>⚔️ Dungeon battles and loot</li>
                            <li>🛍️ Shop for cosmetics and upgrades</li>
                            <li>🏆 Leaderboards and achievements</li>
                          </ul>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app-url.com'}/login"
                               style="background: linear-gradient(45deg, #00ffff, #0080ff); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                              🚀 Start Your Hunt!
                            </a>
                          </div>
                          <p style="font-size: 14px; color: #cccccc; text-align: center; margin-top: 30px;">
                            Happy hunting!<br>
                            The Hunter System Team
                          </p>
                        </div>
                      </div>
                    `,
                  }),
                });

                if (res.ok) {
                  console.log('✅ Approval email sent successfully to:', userData.email);
                } else {
                  console.error('❌ Failed to send approval email:', await res.text());
                }
              } else {
                console.log('⚠️ RESEND_API_KEY not configured, skipping email send');
                console.log('📧 Would send approval email to:', userData.email, 'for hunter:', userData.hunter_name);
              }
            } catch (emailError) {
              console.error('❌ Email sending error:', emailError);
              // Don't fail the approval if email fails
            }

            console.log('📧 Email notification logged (integrate with email service for production)')
          }
        } catch (emailSendError) {
          console.error('❌ Error sending approval email:', emailSendError)
          // Don't fail the approval if email fails
        }

        break
      case 'reject':
        updateData = { status: 'rejected' }
        break
      case 'toggle_admin':
        // Note: is_admin in profiles is for regular users, not admin_profiles
        // This allows regular users to have admin privileges within the game
        updateData = { is_admin: value }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    console.log('✅ User updated successfully')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

