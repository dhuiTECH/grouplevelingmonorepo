import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentUserId = searchParams.get('excludeUserId');
    const searchQuery = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default to 50 if not specified
    const random = searchParams.get('random') === 'true';

    // Build the query
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id, hunter_name, avatar, level, exp, weekly_exp, current_title, current_class, referral_code, active_skin,
        user_cosmetics (
          id,
          equipped,
          shop_items (
            id, name, image_url, slot, z_index, scale, offset_x, offset_y, is_animated, animation_config
          )
        )
      `)
      .eq('is_private', false) // Only fetch public hunters
      .eq('status', 'approved');

    // Exclude current user if provided
    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    // Filter by hunter_name if search query is provided
    if (searchQuery) {
      query = query.ilike('hunter_name', `%${searchQuery}%`);
    } else if (!random) {
        // Only apply limit here if NOT random (since we need to fetch more to shuffle for random)
        query = query.limit(limit);
    }

    const { data: hunters, error } = await query;

    if (error) {
      console.error('Error fetching hunters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch hunter network' },
        { status: 500 }
      );
    }

    let processedHunters = hunters || [];

    // If random is requested, shuffle and limit
    if (random) {
        processedHunters = processedHunters
            .sort(() => 0.5 - Math.random())
            .slice(0, limit);
    }

    // Transform the data to match the expected format
    const transformedHunters = processedHunters.map(hunter => ({
      id: hunter.id,
      name: hunter.hunter_name,
      hunter_name: hunter.hunter_name,
      avatar_url: hunter.avatar,
      level: hunter.level,
      exp: hunter.exp || 0,
      weekly_exp: hunter.weekly_exp || 0,
      current_title: hunter.current_title,
      current_class: hunter.current_class,
      referral_code: hunter.referral_code,
      active_skin: hunter.active_skin,
      cosmetics: hunter.user_cosmetics || []
    }));

    return NextResponse.json({ hunters: transformedHunters });

  } catch (error) {
    console.error('Error in social hunters GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hunter network' },
      { status: 500 }
    );
  }
}