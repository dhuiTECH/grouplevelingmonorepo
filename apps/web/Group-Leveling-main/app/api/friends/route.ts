import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Require Supabase Auth - caller must be the requester (userId1)
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to add friends.' }, { status: 401 });
    }

    const { userId2 } = await request.json();
    const userId1 = authUser.id;

    if (!userId2) {
      return NextResponse.json({ error: 'userId2 (friend to add) is required' }, { status: 400 });
    }

    // Safety check: ensure users are not adding themselves
    if (userId1 === userId2) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a friend' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Check if friendship already exists (in either direction)
    const { data: existingFriendship, error: checkError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .or(`and(user_id_1.eq.${userId1},user_id_2.eq.${userId2}),and(user_id_1.eq.${userId2},user_id_2.eq.${userId1})`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing friendship:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing friendship' },
        { status: 500 }
      );
    }

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Friendship already exists' },
        { status: 400 }
      );
    }

    // Create the friendship request (pending status)
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating friendship:', error);
      return NextResponse.json(
        { error: 'Failed to create friendship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      friendship: data
    });

  } catch (error) {
    console.error('Error in friends POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require Supabase Auth - only return friendships for the authenticated user
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to view friends.' }, { status: 401 });
    }

    const userId = authUser.id;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Fetch all friendships where the user is involved with profile joins
    const { data: friendships, error: friendshipsError } = await supabaseAdmin
      .from('friendships')
      .select(`
        *,
        sender:profiles!user_id_1(
          id, hunter_name, avatar, level, current_title, referral_code, active_skin,
          user_cosmetics (
            id,
            equipped,
            shop_items (
              id, name, image_url, slot, z_index, scale, offset_x, offset_y, is_animated, animation_config
            )
          )
        ),
        receiver:profiles!user_id_2(
          id, hunter_name, avatar, level, current_title, referral_code, active_skin,
          user_cosmetics (
            id,
            equipped,
            shop_items (
              id, name, image_url, slot, z_index, scale, offset_x, offset_y, is_animated, animation_config
            )
          )
        )
      `)
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (friendshipsError) {
      console.error('Error fetching friendships:', friendshipsError);
      return NextResponse.json(
        { error: 'Failed to fetch friendships' },
        { status: 500 }
      );
    }

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ friends: [], friendRequests: [] });
    }

    // Process friendships with joined profile data
    const friends: any[] = [];
    const friendRequests: any[] = []; // Incoming requests
    const outgoingRequests: any[] = []; // Outgoing requests sent by current user

    friendships.forEach(friendship => {
      if (friendship.status === 'accepted') {
        // Determine which profile is the friend (not the current user)
        const friendProfile = friendship.user_id_1 === userId
          ? friendship.receiver
          : friendship.sender;
        // Add to friends list - Map hunter_name to name
        friends.push({
          ...friendProfile,
          name: friendProfile.hunter_name,
          cosmetics: friendProfile.user_cosmetics || []
        });
      } else if (friendship.status === 'pending') {
        if (friendship.user_id_2 === userId) {
          // Current user is the recipient - incoming request
          friendRequests.push({
            id: friendship.id,
            requester: {
              ...friendship.sender,
              name: friendship.sender.hunter_name
            },
            created_at: friendship.created_at
          });
        } else if (friendship.user_id_1 === userId) {
          // Current user is the sender - outgoing request
          outgoingRequests.push({
            id: friendship.id,
            recipient: {
              ...friendship.receiver,
              name: friendship.receiver.hunter_name,
              cosmetics: friendship.receiver.user_cosmetics || []
            },
            created_at: friendship.created_at
          });
        }
      }
    });

    return NextResponse.json({ friends, friendRequests, outgoingRequests });

  } catch (error) {
    console.error('Error in friends GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Require Supabase Auth - only allow accept/reject if current user is party to the friendship
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to update friendship.' }, { status: 401 });
    }

    const { friendshipId, action } = await request.json(); // action: 'accept' or 'reject'

    if (!friendshipId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Verify current user is party to this friendship (user_id_2 for accept/reject - recipient)
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('id, user_id_1, user_id_2')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }
    if (friendship.user_id_1 !== authUser.id && friendship.user_id_2 !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden', details: 'You can only accept or reject friendships you are part of.' }, { status: 403 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const { data, error } = await supabaseAdmin
      .from('friendships')
      .update({ status: newStatus })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) {
      console.error('Error updating friendship status:', error);
      return NextResponse.json(
        { error: 'Failed to update friendship status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      friendship: data
    });

  } catch (error) {
    console.error('Error in friends PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require Supabase Auth - only allow cancel if current user is the sender (user_id_1)
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized', details: 'Please log in to cancel friend request.' }, { status: 401 });
    }

    const { friendshipId } = await request.json();

    if (!friendshipId) {
      return NextResponse.json(
        { error: 'friendshipId is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Verify current user is the sender (only sender can cancel outgoing request)
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('id, user_id_1')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }
    if (friendship.user_id_1 !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden', details: 'Only the sender can cancel a friend request.' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Error deleting friendship:', error);
      return NextResponse.json(
        { error: 'Failed to cancel friend request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Friend request canceled'
    });

  } catch (error) {
    console.error('Error in friends DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}