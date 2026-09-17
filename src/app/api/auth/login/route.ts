import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { syncUserWithSupabase } from '@/lib/supabase/admin';
import { createSessionToken } from '@/lib/auth/session';

/**
 * Production Login Endpoint
 * Authenticates solely through Firebase Authentication ID token.
 * ZERO passwords or password hashes stored in Supabase PostgreSQL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { idToken } = body;

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

    // 2. Lookup or sync user in Supabase PostgreSQL (users table)
    const supaResult = await syncUserWithSupabase({
      firebase_uid: firebaseUid,
      email,
      display_name: verification.name,
      avatar_url: verification.picture,
    });

    const supaUser = supaResult.user;
    if (!supaUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to synchronize user session in database' },
        { status: 500 }
      );
    }

    if (supaUser.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated' },
        { status: 403 }
      );
    }

    // 3. Issue secure session token & cookie
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
      redirectTo,
      user: {
        id: supaUser.id,
        email: supaUser.email,
        username: supaUser.username,
        fullName: supaUser.display_name || supaUser.username,
        avatarUrl: supaUser.avatar_url,
        role: supaUser.profile_data?.role || 'USER',
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
    console.error('Login API error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}

