import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Create server client to get authenticated user
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Not needed for GET request
        },
        remove(name: string, options: any) {
          // Not needed for GET request
        }
      }
    }
  )

  const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser()

  let user = null;
  let userError = null;
  let userTableId = null;
  let adminGranted = false;

  if (authUser) {
    // Try to find user by auth_user_id first
    let { data: userData, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (findError && findError.code === 'PGRST116') { // No row found
      // Fallback: Try to find user by email if auth_user_id not linked yet
      ({ data: userData, error: findError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single());

      if (userData && !userData.auth_user_id) {
        // Link existing user to auth_user_id
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ auth_user_id: authUser.id })
          .eq('id', userData.id);
        if (updateError) console.error('Failed to link auth_user_id:', updateError);
        else console.log('✅ Linked existing user to auth_user_id:', userData.id);
      }
    }

    if (userData) {
      user = userData;
      userTableId = userData.id;
      // Emergency: Grant admin access to damonhui@hotmail.com if not already admin
      if (authUser.email === 'damonhui@hotmail.com' && !userData.is_admin) {
        const { error: adminUpdateError } = await supabaseAdmin
          .from('users')
          .update({ is_admin: true })
          .eq('id', userData.id);
        if (adminUpdateError) console.error('Failed to grant admin access:', adminUpdateError);
        else {
          console.log('🚨 Emergency: Granted admin access to damonhui@hotmail.com');
          user.is_admin = true; // Update in memory for immediate response
          adminGranted = true;
        }
      }
    }
    userError = findError?.message || null;
  }

  try {
    // Check if tables exist by trying to query them
    const tables = [];
    const tableChecks = ['dungeon_completions', 'shop_items', 'users'];

    for (const tableName of tableChecks) {
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .select('id')
          .limit(1);
        if (!error) {
          tables.push(tableName);
        }
      } catch (e) {
        // Table doesn't exist or can't be queried
      }
    }

    // Also provide a way to grant admin access
    const grantAdminResult = await supabaseAdmin
      .from('users')
      .update({ is_admin: true })
      .eq('email', 'damonhui@hotmail.com')
      .select();

    return NextResponse.json({
      authUser: authUser ? { id: authUser.id, email: authUser.email } : null,
      authError: authError?.message || null,
      user,
      userError,
      userTableId,
      tables,
      adminGranted,
      tablesError: null
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
