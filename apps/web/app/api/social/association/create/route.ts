import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const { name, emblem_url } = await req.json();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Safe to ignore in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Safe to ignore in Server Components
          }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Check user's coin balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.coins < 100000) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // 2. Deduct coins and create association in a transaction
    const newAssociationId = uuidv4();
    
    // a. Deduct coins
    const { error: coinError } = await supabase
      .from('profiles')
      .update({ coins: profile.coins - 100000 })
      .eq('id', user.id);

    if (coinError) throw coinError;

    // b. Create the association
    const { data: newAssociation, error: associationError } = await supabase
      .from('associations')
      .insert({
        id: newAssociationId,
        name,
        emblem_url,
        leader_id: user.id,
      })
      .select()
      .single();

    if (associationError) {
        console.error("Failed to create association, but coins were deducted:", associationError);
        throw associationError;
    }

    return NextResponse.json({ association_id: newAssociation.id }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
