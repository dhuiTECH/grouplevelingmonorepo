import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { userId, rating } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // 1. Reset all training protocol items to not completed
    const { error: resetError } = await supabaseAdmin
      .from('training_protocol')
      .update({ is_completed: false })
      .eq('hunter_id', userId);

    if (resetError) {
      console.error('Reset protocol error:', resetError);
      throw resetError;
    }

    // 2. Delete all nutrition logs for the week
    const { error: nutritionError } = await supabaseAdmin
      .from('nutrition_logs')
      .delete()
      .eq('hunter_id', userId);

    if (nutritionError) {
      console.error('Reset nutrition error:', nutritionError);
      throw nutritionError;
    }

    // 3. Update last_reset timestamp in profiles and potentially store feedback
    // (Assuming we might want to store the rating somewhere later, but for now just logging/ignoring or storing in a metadata field if available)
    // We'll just update last_reset for now.
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        last_reset: new Date().toISOString() 
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw profileError;
    }

    // Optionally: Create a log entry for the weekly review if you have a table for it
    // For now, we'll skip creating a new table unless requested.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Weekly reset failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
