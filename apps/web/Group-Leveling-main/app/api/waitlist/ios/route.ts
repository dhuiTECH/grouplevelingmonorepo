import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, hunter_name } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.log('📝 Joining waitlist table:', { email });

    // Insert into waitlist table - only email is supported based on actual schema
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert([
        { 
          email: email.trim().toLowerCase()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Waitlist insertion error:', error);
      // Handle duplicate email (Postgres error code 23505)
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            message: 'You are already on the waitlist! We will notify you when the iOS/Android app is ready.',
            alreadyEnrolled: true 
          },
          { status: 200 }
        );
      }
      
      console.error('Waitlist insertion error:', error);
      return NextResponse.json(
        { error: 'Failed to join waitlist', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Successfully joined the iOS/Android waitlist! We will notify you as soon as the app is released.',
        success: true 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
