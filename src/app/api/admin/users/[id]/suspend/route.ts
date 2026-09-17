import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/security/rbac';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import logger from '@/lib/monitoring/logger';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPlatformAdmin(user.role)) {
      logger.security('Non-admin user attempted to suspend account', {
        userId: user.id,
        role: user.role,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. Platform Administrator credentials required.' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { suspend = true, reason } = body;

    // Prevent suspending self
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot suspend your own administrator account' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    await supabase
      .from('users')
      .update({
        is_active: !suspend,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    // Audit log in platform_data
    await supabase.from('platform_data').insert({
      data_type: 'audit',
      user_id: user.id,
      target_id: targetUserId,
      status: suspend ? 'SUSPENDED' : 'ACTIVATED',
      data: {
        action: suspend ? 'USER_SUSPEND' : 'USER_UNSUSPEND',
        reason: reason || '',
      },
    });

    logger.info('User account suspension status updated', {
      adminId: user.id,
      targetUserId,
      suspend,
    });

    return NextResponse.json({ success: true, targetUserId, isSuspended: suspend });
  } catch (error: any) {
    logger.error('Error in user suspension route', error);
    return NextResponse.json({ success: false, error: 'Unable to update user status' }, { status: 500 });
  }
}
