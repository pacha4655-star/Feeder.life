import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params;
    const supabase = getSupabaseServerClient();
    const { data: supaUser, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, city, country_code, region, interests, created_at, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !supaUser || !supaUser.is_active) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: supaUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await context.params;

    // Enforce identity: User A cannot edit User B's profile
    if (user.id !== targetUserId) {
      logger.security('IDOR attempt: User tried to edit another user profile', {
        userId: user.id,
        targetUserId,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot modify another user profile.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Prevent privilege escalation: ignore any role or status field sent by client
    if (body.role || body.status || body.is_active || body.is_verified) {
      logger.security('Privilege escalation attempt: Client sent role/status field', {
        userId: user.id,
        attemptedRole: body.role,
      });
    }

    const displayName = body.displayName ? sanitizeText(body.displayName).slice(0, 80) : undefined;
    const bio = body.bio !== undefined ? sanitizeText(body.bio).slice(0, 500) : undefined;
    const city = body.city !== undefined ? sanitizeText(body.city).slice(0, 100) : undefined;
    const countryCode = body.countryCode !== undefined ? sanitizeText(body.countryCode).toUpperCase().slice(0, 2) : undefined;
    const avatarUrl = body.avatarUrl !== undefined ? sanitizeUrl(body.avatarUrl) : undefined;

    const supabase = getSupabaseServerClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (displayName !== undefined) updatePayload.display_name = displayName;
    if (bio !== undefined) updatePayload.bio = bio;
    if (city !== undefined) updatePayload.city = city;
    if (countryCode !== undefined) updatePayload.country_code = countryCode;
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;

    const { error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
