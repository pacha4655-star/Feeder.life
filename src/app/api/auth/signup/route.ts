import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { createSessionToken } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, username, fullName, password } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required' }, { status: 400 });
    }
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    const supabase = getSupabaseServerClient();

    // Check unique constraints
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${cleanEmail},username.eq.${cleanUsername}`)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.email?.toLowerCase() === cleanEmail) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: 'This username is already taken' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
    const firebaseUid = body.firebaseUid || `local_${userId}`;

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        id: userId,
        firebase_uid: firebaseUid,
        email: cleanEmail,
        username: cleanUsername,
        display_name: fullName.trim(),
        avatar_url: defaultAvatar,
        is_active: true,
        is_verified: false,
        profile_data: {
          area_name: '',
          feeder_level: 'Grassroots Feeder',
          feeding_count: 0,
          sos_count: 0,
          password_hash: passwordHash,
        },
      })
      .select()
      .single();

    if (insertErr || !newUser) {
      return NextResponse.json({ success: false, error: insertErr?.message || 'Registration failed' }, { status: 400 });
    }

    const sessionToken = createSessionToken({
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      firebase_uid: firebaseUid,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        fullName: fullName.trim(),
      },
      redirectTo: '/onboarding',
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
    console.error('Signup error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
