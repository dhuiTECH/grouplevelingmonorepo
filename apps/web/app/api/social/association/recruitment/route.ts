import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Get all hunters with pending applications for this association
    const { data: applicants, error: applicantsError } = await supabaseAdmin
      .from('profiles')
      .select('id, hunter_name, avatar, level, exp, current_title, current_class, created_at')
      .eq('pending_association_id', userProfile.association_id)
      .eq('association_id', null); // Ensure they don't already belong to another association

    if (applicantsError) {
      console.error('Error fetching applicants:', applicantsError);
      return NextResponse.json(
        { error: 'Failed to fetch applicants' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applicants: applicants || [],
      count: (applicants || []).length
    });

  } catch (error) {
    console.error('Error in recruitment GET:', error);
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

    const { applicantId, action } = await request.json(); // action: 'accept' or 'reject'

    if (!applicantId || !['accept', 'reject'].includes(action)) {
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

    // Get the applicant's profile
    const { data: applicant, error: applicantError } = await supabaseAdmin
      .from('profiles')
      .select('id, pending_association_id')
      .eq('id', applicantId)
      .single();

    if (applicantError || !applicant) {
      return NextResponse.json(
        { error: '[SYSTEM] APPLICANT NOT FOUND' },
        { status: 404 }
      );
    }

    // Verify the applicant has a pending application for this association
    if (applicant.pending_association_id !== userProfile.association_id) {
      return NextResponse.json(
        { error: '[SYSTEM] NOT AUTHORIZED' },
        { status: 403 }
      );
    }

    if (action === 'accept') {
      // Accept: Move pending to actual association membership
      const { error: acceptError } = await supabaseAdmin
        .from('profiles')
        .update({
          association_id: userProfile.association_id,
          pending_association_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicantId);

      if (acceptError) {
        console.error('Error accepting applicant:', acceptError);
        return NextResponse.json(
          { error: 'Failed to accept applicant' },
          { status: 500 }
        );
      }

      // Update association member count
      const { error: countError } = await supabaseAdmin.rpc('increment_member_count', {
        association_id: userProfile.association_id
      });

      if (countError) {
        console.error('Error updating member count:', countError);
      }

      return NextResponse.json({
        success: true,
        message: '[SYSTEM] NEW HUNTER SYNCED TO ROSTER'
      });

    } else if (action === 'reject') {
      // Reject: Clear the pending application
      const { error: rejectError } = await supabaseAdmin
        .from('profiles')
        .update({
          pending_association_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicantId);

      if (rejectError) {
        console.error('Error rejecting applicant:', rejectError);
        return NextResponse.json(
          { error: 'Failed to reject applicant' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '[SYSTEM] APPLICATION REJECTED'
      });
    }

  } catch (error) {
    console.error('Error in recruitment PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}