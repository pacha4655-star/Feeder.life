import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Resolves an email address for a given username to support username-based Firebase Login.
 * Only returns the email if the account exists in the Supabase users table.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = (searchParams.get('username') || '').trim().toLowerCase();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    const isCheckOnly = searchParams.get('check') === 'available' || searchParams.get('check') === '1';
    const supabase = getSupabaseServerClient();

    if (isCheckOnly) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ success: true, available: false, error: 'Username is already taken' });
      }
      return NextResponse.json({ success: true, available: true });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('email, is_active')
      .ilike('username', username)
      .maybeSingle();

    if (error || !user || !user.email) {
      return NextResponse.json({ success: false, error: 'No account found with this username' }, { status: 404 });
    }

    if (user.is_active === false) {
      return NextResponse.json({ success: false, error: 'This account has been deactivated' }, { status: 403 });
    }

    return NextResponse.json({ success: true, email: user.email });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
