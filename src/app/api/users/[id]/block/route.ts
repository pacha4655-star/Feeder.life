import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('user_block', user.id, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const { id: targetUserId } = await context.params;

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot block yourself' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    await supabase.from('platform_data').insert({
      data_type: 'block',
      user_id: user.id,
      target_id: targetUserId,
      status: 'active',
      data: {
        blocked_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, blockedUserId: targetUserId, isBlocked: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await context.params;
    const supabase = getSupabaseServerClient();

    await supabase
      .from('platform_data')
      .delete()
      .eq('data_type', 'block')
      .eq('user_id', user.id)
      .eq('target_id', targetUserId);

    return NextResponse.json({ success: true, unblockedUserId: targetUserId, isBlocked: false });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
