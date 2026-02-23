import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get current quarter in YYYY-QN format
function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

// Get days until end of quarter
function getDaysUntilQuarterEnd(): number {
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const endOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 0);
  const diffTime = endOfQuarter.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    // Get current userId from query parameter
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const currentQuarter = getCurrentQuarter();

    // Get all feedback for current quarter, ordered by net_score descending
    const { data: feedback, error } = await supabaseAdmin
      .from('community_feedback')
      .select(`
        *,
        hunter:profiles!hunter_id(id, hunter_name, avatar, level, current_title, current_class, cosmetics, base_body_url, gender)
      `)
      .eq('quarter', currentQuarter)
      .order('net_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch community feedback' },
        { status: 500 }
      );
    }

    // Get user's votes for this quarter (if userId provided)
    let userVotes: any[] = [];
    if (userId) {
      const { data: votes, error: votesError } = await supabaseAdmin
        .from('feedback_votes')
        .select('feedback_id, vote_type')
        .eq('voter_id', userId)
        .eq('vote_quarter', currentQuarter);

      if (!votesError && votes) {
        userVotes = votes;
      }
    }

    // Create lookup for user's votes
    const voteLookup = userVotes.reduce((acc, vote) => {
      acc[vote.feedback_id] = vote.vote_type;
      return acc;
    }, {});

    // Add vote status to each feedback item
    const feedbackWithVotes = (feedback || []).map(item => ({
      ...item,
      userVote: voteLookup[item.id] || null
    }));

    return NextResponse.json({
      feedback: feedbackWithVotes,
      daysUntilReset: getDaysUntilQuarterEnd(),
      currentQuarter
    });

  } catch (error) {
    console.error('Error in feedback GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Feedback content must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Check if user already submitted feedback this quarter
    const currentQuarter = getCurrentQuarter();
    const { data: existingFeedback, error: checkError } = await supabaseAdmin
      .from('community_feedback')
      .select('id')
      .eq('hunter_id', userId)
      .eq('quarter', currentQuarter)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing feedback:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing feedback' },
        { status: 500 }
      );
    }

    if (existingFeedback) {
      return NextResponse.json(
        { error: '[SYSTEM] FEEDBACK ALREADY SUBMITTED THIS QUARTER' },
        { status: 400 }
      );
    }

    // Submit the feedback
    const { data: newFeedback, error: submitError } = await supabaseAdmin
      .from('community_feedback')
      .insert({
        hunter_id: userId,
        content: content.trim()
      })
      .select()
      .single();

    if (submitError) {
      console.error('Error submitting feedback:', submitError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '[SYSTEM] FEEDBACK TRANSMITTED',
      feedback: newFeedback
    });

  } catch (error) {
    console.error('Error in feedback POST:', error);
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

    const { feedbackId, voteType } = await request.json(); // voteType: 'resonate' or 'interfere'

    if (!feedbackId || !['resonate', 'interfere'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const currentQuarter = getCurrentQuarter();
    const voteValue = voteType === 'resonate' ? 1 : -1;

    // Check if user already voted on this feedback this quarter
    const { data: existingVote, error: checkError } = await supabaseAdmin
      .from('feedback_votes')
      .select('id')
      .eq('voter_id', userId)
      .eq('feedback_id', feedbackId)
      .eq('vote_quarter', currentQuarter)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing vote:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing vote' },
        { status: 500 }
      );
    }

    if (existingVote) {
      return NextResponse.json(
        { error: '[SYSTEM] ALREADY VOTED THIS QUARTER' },
        { status: 400 }
      );
    }

    // Create the vote
    const { error: voteError } = await supabaseAdmin
      .from('feedback_votes')
      .insert({
        voter_id: userId,
        feedback_id: feedbackId,
        vote_type: voteType,
        vote_value: voteValue,
        vote_quarter: currentQuarter
      });

    if (voteError) {
      console.error('Error creating vote:', voteError);
      return NextResponse.json(
        { error: 'Failed to submit vote' },
        { status: 500 }
      );
    }

    // Update the feedback's net score
    await supabaseAdmin.rpc('update_feedback_score', {
      feedback_uuid: feedbackId,
      current_quarter: currentQuarter
    });

    return NextResponse.json({
      success: true,
      message: voteType === 'resonate'
        ? '[SYSTEM] RESONANCE REGISTERED'
        : '[SYSTEM] INTERFERENCE APPLIED'
    });

  } catch (error) {
    console.error('Error in feedback PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}