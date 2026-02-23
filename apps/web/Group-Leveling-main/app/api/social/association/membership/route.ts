import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get current userId from query parameter
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Check if user is an association leader
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('association_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (!userProfile.association_id) {
      return NextResponse.json(
        { error: '[SYSTEM] NOT AN ASSOCIATION LEADER' },
        { status: 403 }
      );
    }

    // Verify user is the leader of their association
    const { data: association, error: assocError } = await supabaseAdmin
      .from('associations')
      .select('id, leader_id')
      .eq('id', userProfile.association_id)
      .single();

    if (assocError || !association) {
      console.error('Error fetching association:', assocError);
      return NextResponse.json(
        { error: 'Failed to fetch association' },
        { status: 500 }
      );
    }

    if (association.leader_id !== userId) {
      return NextResponse.json(
        { error: '[SYSTEM] NOT AUTHORIZED' },
        { status: 403 }
      );
    }

    // Get all pending membership applications for this association
    const { data: applications, error: appsError } = await supabaseAdmin
      .from('memberships')
      .select(`
        *,
        applicant:profiles!hunter_id(id, hunter_name, avatar, level, current_title, exp)
      `)
      .eq('association_id', userProfile.association_id)
      .eq('status', 'pending');

    if (appsError) {
      console.error('Error fetching membership applications:', appsError);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applications: applications || []
    });

  } catch (error) {
    console.error('Error in membership GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get current userId from query parameter
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const { membershipId, action } = await request.json(); // action: 'approve' or 'reject'

    if (!membershipId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Check if user is an association leader
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('association_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (!userProfile.association_id) {
      return NextResponse.json(
        { error: '[SYSTEM] NOT AN ASSOCIATION LEADER' },
        { status: 403 }
      );
    }

    // Get the membership application
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('*')
      .eq('id', membershipId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '[SYSTEM] APPLICATION NOT FOUND' },
        { status: 404 }
      );
    }

    // Verify the membership belongs to user's association
    if (membership.association_id !== userProfile.association_id) {
      return NextResponse.json(
        { error: '[SYSTEM] NOT AUTHORIZED' },
        { status: 403 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the membership status
    const { data: updatedMembership, error: updateError } = await supabaseAdmin
      .from('memberships')
      .update({
        status: newStatus,
        decided_at: new Date().toISOString(),
        decided_by: userId
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating membership status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update membership status' },
        { status: 500 }
      );
    }

    // If approved, update the applicant's profile to link them to the association
    if (action === 'approve') {
      const { error: linkError } = await supabaseAdmin
        .from('profiles')
        .update({
          association_id: membership.association_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', membership.hunter_id);

      if (linkError) {
        console.error('Error linking applicant to association:', linkError);
        // Don't return error here as the membership was updated successfully
        // The applicant can be linked manually later
      }

      // Update association member count
      const { error: countError } = await supabaseAdmin.rpc('increment_member_count', {
        association_id: membership.association_id
      });

      if (countError) {
        console.error('Error updating member count:', countError);
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? '[SYSTEM] APPLICATION APPROVED - MEMBER ADDED'
        : '[SYSTEM] APPLICATION REJECTED',
      membership: updatedMembership
    });

  } catch (error) {
    console.error('Error in membership PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}