import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: 'Email/username and password are required' }, { status: 400 });
    }

    const cleanId = identifier.trim().toLowerCase();
    const supabase = getSupabaseServerClient();

    const { data: userRows, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId}`)
      .limit(1);

    const user = userRows && userRows[0];

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Invalid login credentials' }, { status: 401 });
    }

    if (user.is_active === false) {
      return NextResponse.json({ success: false, error: 'Your account is suspended or deactivated' }, { status: 403 });
    }

    const passwordHash = user.profile_data?.password_hash;
    if (passwordHash) {
      const isValid = await verifyPassword(password, passwordHash);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Invalid login credentials' }, { status: 401 });
      }
    }

    const sessionToken = createSessionToken({
      id: user.id,
      email: user.email,
      username: user.username,
      firebase_uid: user.firebase_uid,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.display_name || user.username,
        avatarUrl: user.avatar_url,
        role: user.role || 'USER',
      },
    });

    response.cookies.set('feeder_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
