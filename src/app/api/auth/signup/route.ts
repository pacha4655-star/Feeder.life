import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { syncUserWithSupabase } from '@/lib/supabase/admin';
import { createSessionToken } from '@/lib/auth/session';

/**
 * Production Signup Endpoint
 * Authenticates solely through Firebase Authentication ID token.
 * ZERO passwords or password hashes stored in Supabase PostgreSQL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { idToken, username, fullName } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Firebase authentication token is required' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify Firebase ID token
    const verification = await verifyFirebaseIdToken(idToken);
    if (!verification.success || !verification.uid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Authentication verification failed' },
        { status: 401 }
      );
    }

    const firebaseUid = verification.uid;
    const email = (verification.email || '').trim().toLowerCase();
    const displayName = (fullName || verification.name || (email ? email.split('@')[0] : 'Feeder Guardian')).trim();
    const avatarUrl =
      verification.picture ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

    // 2. Synchronize user in Supabase PostgreSQL (users table)
    const supaResult = await syncUserWithSupabase({
      firebase_uid: firebaseUid,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      username: username ? username.trim() : undefined,
    });

    const supaUser = supaResult.user;
    if (!supaUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to synchronize user profile in database' },
        { status: 500 }
      );
    }

    // 3. Create session token & cookie
    const sessionToken = createSessionToken({
      id: supaUser.id,
      email: supaUser.email,
      username: supaUser.username || undefined,
      firebase_uid: firebaseUid,
    });

    const isNew = supaResult.isNewUser || !supaUser.onboarding_completed;
    const redirectTo = isNew ? '/onboarding' : '/';

    const response = NextResponse.json({
      success: true,
      isNewUser: isNew,
      redirectTo,
      user: {
        id: supaUser.id,
        email: supaUser.email,
        username: supaUser.username,
        fullName: supaUser.display_name,
        avatarUrl: supaUser.avatar_url,
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
    console.error('Signup API error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}

