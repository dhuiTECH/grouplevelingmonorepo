import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
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

    const { associationId } = await request.json();

    if (!associationId) {
      return NextResponse.json(
        { error: 'associationId is required' },
        { status: 400 }
      );
    }

    // Check if user already belongs to an association or has a pending application
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('association_id, pending_association_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (userProfile.association_id) {
      return NextResponse.json(
        { error: '[SYSTEM] ALREADY IN HUNTER ASSOCIATION' },
        { status: 400 }
      );
    }

    if (userProfile.pending_association_id) {
      return NextResponse.json(
        { error: '[SYSTEM] APPLICATION ALREADY PENDING' },
        { status: 400 }
      );
    }

    // Check if association exists
    const { data: association, error: assocError } = await supabaseAdmin
      .from('associations')
      .select('id, name')
      .eq('id', associationId)
      .single();

    if (assocError || !association) {
      return NextResponse.json(
        { error: '[SYSTEM] HUNTER ASSOCIATION NOT FOUND' },
        { status: 404 }
      );
    }

    // Set the pending association for the user
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        pending_association_id: associationId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating pending association:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '[SYSTEM] MEMBERSHIP APPLICATION SUBMITTED',
      association: association
    });

  } catch (error) {
    console.error('Error in association apply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}