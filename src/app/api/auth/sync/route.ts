import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { syncUserWithSupabase } from '@/lib/supabase/admin';
import { createSessionToken } from '@/lib/auth/session';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Authentication token is required' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify the Firebase ID token on the server
    // Never trust frontend-supplied user IDs or claims.
    const verification = await verifyFirebaseIdToken(idToken);
    if (!verification.success || !verification.uid) {
      return NextResponse.json(
        { success: false, error: 'Unable to sign in with Google. Please try again.' },
        { status: 401 }
      );
    }

    const firebaseUid = verification.uid;
    const email = (verification.email || '').trim().toLowerCase();
    const displayName = verification.name || (email ? email.split('@')[0] : 'Feeder Guardian');
    const avatarUrl =
      verification.picture ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

    // 2. Synchronize user with Supabase PostgreSQL (users table)
    const supaResult = await syncUserWithSupabase({
      firebase_uid: firebaseUid,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    const supaUser = supaResult.user;
    if (!supaUser) {
      console.error('[Auth Sync] Supabase sync failed:', supaResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to synchronize user profile in database.' },
        { status: 500 }
      );
    }

    if (!supaUser.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated.' },
        { status: 403 }
      );
    }

    // 3. Generate secure session token and cookie
    // The session token is an HMAC-SHA256 signed token embedding the Supabase user ID and Firebase UID.
    const sessionToken = createSessionToken({
      id: supaUser.id,
      firebase_uid: firebaseUid,
      email: supaUser.email,
    });

    // 5. Determine redirection based on onboarding completion status
    const isNew = supaResult.isNewUser || !supaUser.onboarding_completed;
    const redirectTo = isNew ? '/onboarding' : '/';

    const response = NextResponse.json({
      success: true,
      isNewUser: isNew,
      redirectTo,
      user: {
        id: supaUser.id,
        firebaseUid: supaUser.firebase_uid,
        email: supaUser.email,
        username: supaUser.username,
        displayName: supaUser.display_name,
        avatarUrl: supaUser.avatar_url,
        onboardingCompleted: supaUser.onboarding_completed,
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
  } catch (err: any) {
    console.error('[Auth Sync] Server error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to sign in with Google. Please try again.' },
      { status: 500 }
    );
  }
}
