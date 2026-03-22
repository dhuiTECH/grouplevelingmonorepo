import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Function to equip item by ID
async function equipItemById(hunterId: string, itemId: string) {
  try {
    // Check if user already has this item equipped
    const { data: existingCosmetic } = await supabaseAdmin
      .from('user_cosmetics')
      .select('id')
      .eq('hunter_id', hunterId)
      .eq('shop_item_id', itemId)
      .single()

    if (!existingCosmetic) {
      // Add to user cosmetics and mark as equipped
      const { error: cosmeticError } = await supabaseAdmin
        .from('user_cosmetics')
        .insert({
          hunter_id: hunterId,
          shop_item_id: itemId,
          equipped: true
        })

      if (cosmeticError) {
        console.error('❌ Failed to equip item:', cosmeticError)
        return false
      } else {
        console.log('✅ Item equipped for character')
        return true
      }
    } else {
      console.log('ℹ️ Item already equipped for character')
      return true
    }
  } catch (error) {
    console.error('❌ Error equipping item:', error)
    return false
  }
}

// Function to equip default white t-shirt
async function equipDefaultTShirt(hunterId: string) {
  try {
    console.log('🔄 Attempting to equip white t-shirt for user:', hunterId)

    // First, let's see what shop items exist
    const { data: allItems, error: listError } = await supabaseAdmin
      .from('shop_items')
      .select('id, name, slot')
      .eq('is_active', true)

    console.log('📋 All active shop items:', allItems)

    // Find the white t-shirt item (unisex version)
    let whiteTShirt;
    const { data: initialWhiteTShirt, error: itemError } = await supabaseAdmin
      .from('shop_items')
      .select('id, name')
      .eq('name', 'White T-Shirt (Unisex)')
      .eq('is_active', true)
      .single()

    console.log('🔍 Shop item search result:', { whiteTShirt, itemError })

    // Try different possible names if the first one doesn't work
    if (!whiteTShirt) {
      console.log('🔄 Trying alternative names...')
      const possibleNames = ['White T-Shirt (Unisex)', 'White T-Shirt (F)', 'White T-Shirt']

      for (const name of possibleNames) {
        console.log(`🔍 Trying name: "${name}"`)
        const { data: item, error } = await supabaseAdmin
          .from('shop_items')
          .select('id, name')
          .eq('name', name)
          .eq('is_active', true)
          .single()

        if (item && !error) {
          console.log(`✅ Found item with name "${name}":`, item)
          whiteTShirt = item
          break
        }
      }
    }

    // Also try searching by ID if name doesn't work
    if (!whiteTShirt) {
      console.log('🔄 Trying to find by ID: a3659612-0acd-4e96-96ee-26643ce78502')
      const { data: whiteTShirtById, error: idError } = await supabaseAdmin
        .from('shop_items')
        .select('id, name')
        .eq('id', 'a3659612-0acd-4e96-96ee-26643ce78502')
        .single()

      if (whiteTShirtById) {
        console.log('✅ Found item by ID:', whiteTShirtById)
        return await equipItemById(hunterId, whiteTShirtById.id)
      }
    }

    if (whiteTShirt && !itemError) {
      // Check if user already has this item equipped
      const { data: existingCosmetic } = await supabaseAdmin
        .from('user_cosmetics')
        .select('id')
        .eq('hunter_id', hunterId)
        .eq('shop_item_id', whiteTShirt.id)
        .single()

      if (!existingCosmetic) {
        // Add to user cosmetics and mark as equipped
        const { error: cosmeticError } = await supabaseAdmin
          .from('user_cosmetics')
          .insert({
            hunter_id: hunterId,
            shop_item_id: whiteTShirt.id,
            equipped: true
          })

        if (cosmeticError) {
          console.error('❌ Failed to equip default white t-shirt:', cosmeticError)
          return false
        } else {
          console.log('✅ Default white t-shirt equipped for character')
          return true
        }
      } else {
        console.log('ℹ️ White t-shirt already equipped for character')
        return true
      }
    } else {
      console.log('⚠️ White T-Shirt (Unisex) not found in shop_items')
      return false
    }
  } catch (error) {
    console.error('❌ Error equipping default white t-shirt:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  // Skip processing if Supabase is not configured (for build)
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured. Missing SUPABASE_SERVICE_ROLE_KEY?')
    return NextResponse.json({ 
      error: 'Not configured', 
      details: 'Supabase service role key is missing.'
    }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { hunter_name, name, gender, avatar, email, base_body_url: baseBodyUrl } = body

    // Support both 'name' and 'hunter_name' for compatibility
    const finalName = (hunter_name || name || '').trim()
    const finalEmail = email?.trim() || null

    console.log('📝 Onboarding request received:', { hunter_name: finalName, gender, avatar, email: finalEmail })

    if (!finalName) {
      return NextResponse.json({ 
        error: 'Name is required',
        message: 'Hunter name is required to awaken.'
      }, { status: 400 })
    }

    // Check for duplicates on unique fields: hunter_name, email
    const duplicateChecks = {
      hunter_name: null as any,
      email: null as any
    }

    // Check hunter_name
    const { data: nameProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, hunter_name, email, status, created_at')
      .eq('hunter_name', finalName)
      .single()
    
    if (nameProfile) {
      duplicateChecks.hunter_name = nameProfile
    }

    // Check email (if provided)
    if (finalEmail) {
      const { data: emailProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, hunter_name, email, status, created_at')
        .eq('email', finalEmail)
        .single()
      
      if (emailProfile) {
        duplicateChecks.email = emailProfile
      }
    }

    // Build detailed duplicate feedback message
    const duplicates = Object.entries(duplicateChecks)
      .filter(([_, profile]) => profile !== null)
      .map(([field, profile]) => ({ field, profile }))

    if (duplicates.length > 0) {
      const duplicateFields = duplicates.map(d => d.field).join(', ')
      const duplicateProfile = duplicates[0].profile
      
      console.log('⚠️ Duplicate profile detected:', { duplicates, duplicateProfile })

      let message = 'A hunter already exists with the same '
      if (duplicates.length === 1) {
        message += `${duplicates[0].field === 'hunter_name' ? 'name' : 'email'}.`
      } else {
        message += `${duplicateFields.replace(/_/g, ' ')}.`
      }
      
      message += `\n\nExisting Hunter Details:\n`
      message += `• Name: ${duplicateProfile.hunter_name}\n`
      if (duplicateProfile.email) message += `• Email: ${duplicateProfile.email}\n`
      message += `• Status: ${duplicateProfile.status}\n`
      message += `• Created: ${new Date(duplicateProfile.created_at).toLocaleDateString()}\n\n`
      message += `Please use a different ${duplicateFields.replace(/_/g, ' ')} or log in if this is your account.`

      return NextResponse.json({ 
        error: 'Duplicate profile detected',
        message: message,
        duplicateFields: duplicateFields.split(', '),
        existingUser: duplicateProfile,
        duplicates: duplicates
      }, { status: 409 })
    }

    // Determine avatar based on gender if not provided. Non-binary uses base_body_url for visual body.
    let finalAvatar = avatar
    if (!finalAvatar) {
      const userGender = gender || 'Male'
      if (userGender === 'Female') {
        finalAvatar = '/NoobWoman.png'
      } else if (userGender === 'Non-binary') {
        finalAvatar = (baseBodyUrl === '/NoobMan.png' || baseBodyUrl === '/NoobWoman.png') ? baseBodyUrl : '/NoobMan.png'
      } else {
        finalAvatar = '/NoobMan.png'
      }
    }

    // Ensure gender has a valid value
    const finalGender = (gender && gender.trim()) || 'Male'
    console.log('👤 Final gender value:', finalGender)

    // Generate a referral code for the new user
    const referralCode = `HUNT-${finalName.substring(0, 3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

    // Create profile directly - no authentication needed
    const insertPayload: Record<string, unknown> = {
        hunter_name: finalName,
        email: finalEmail,
        gender: finalGender,
        avatar: finalAvatar,
        exp: 0,
        coins: 0, // Starting coins
        level: 1,
        hunter_rank: 'E',
        weekly_slots_used: 0,
        last_reset: new Date().toISOString(),
        status: 'pending',
        onboarding_completed: true,
        referral_code: referralCode,
        created_at: new Date().toISOString(),
        world_x: 24,
        world_y: 64,
      }
    if (baseBodyUrl && (baseBodyUrl === '/NoobMan.png' || baseBodyUrl === '/NoobWoman.png')) {
      insertPayload.base_body_url = baseBodyUrl
    }
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert(insertPayload)
      .select('id, hunter_name, email, avatar, gender, exp, coins, level, hunter_rank, status, onboarding_completed, created_at')
      .single()

    if (createError) {
      console.error('❌ Failed to create profile:', createError)
      
      // Check if it's a unique constraint violation
      if (createError.code === '23505') { // PostgreSQL unique violation
        const constraint = createError.message.match(/Key \(([^)]+)\)/)?.[1] || 'field'
        return NextResponse.json({ 
          error: 'Duplicate profile detected',
          message: `A hunter with the same ${constraint} already exists. Please use a different ${constraint} or log in if this is your account.`,
          details: createError.message
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: createError.message
      }, { status: 500 })
    }

    console.log('✅ Profile created successfully:', newProfile)
    console.log('🔗 Profile ID:', newProfile.id)

    // Auto-equip default white t-shirt for all characters
    await equipDefaultTShirt(newProfile.id)
    
    // Build success message
    let successMessage = `Hunter "${newProfile.hunter_name}" has been awakened successfully!\n\n`
    successMessage += `Account Details:\n`
    successMessage += `• Name: ${newProfile.hunter_name}\n`
    if (newProfile.email) successMessage += `• Email: ${newProfile.email}\n`
    successMessage += `• Status: ${newProfile.status}\n`
    successMessage += `• Created: ${new Date(newProfile.created_at).toLocaleString()}\n\n`
    successMessage += `Your account is pending approval. An admin will review your application soon.`

    return NextResponse.json({
      success: true,
      user: {
        id: newProfile.id,
        name: newProfile.hunter_name,
        hunter_name: newProfile.hunter_name,
        email: newProfile.email,
        avatar: newProfile.avatar,
        gender: newProfile.gender,
        xp: Number(newProfile.exp),
        exp: Number(newProfile.exp),
        coins: Number(newProfile.coins),
        level: newProfile.level,
        rank: newProfile.hunter_rank,
        hunter_rank: newProfile.hunter_rank,
        status: newProfile.status,
        onboarding_completed: newProfile.onboarding_completed
      },
      message: successMessage,
      details: {
        id: newProfile.id,
        hunter_name: newProfile.hunter_name,
        email: newProfile.email,
        status: newProfile.status,
        created_at: newProfile.created_at
      }
    })

  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ 
      error: 'Failed to process onboarding',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Migration endpoint for equipping t-shirts on existing users
export async function PATCH(request: NextRequest) {
  try {
    // Get all approved users
    const { data: users, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, hunter_name')
      .eq('status', 'approved')

    if (userError) throw userError

    let equippedCount = 0
    for (const user of users || []) {
      const equipped = await equipDefaultTShirt(user.id)
      if (equipped) equippedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${users?.length || 0} users, equipped white t-shirts for ${equippedCount} users`
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
