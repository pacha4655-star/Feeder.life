import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NotificationService } from '@/lib/services/notifications';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { targetUserId, action } = body; // action: 'APPROVE' | 'REJECT'

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Target user ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: comm, error: fetchErr } = await supabase
      .from('communities')
      .select('id, name, created_by, roles, settings, members, stats')
      .eq('id', communityId)
      .single();

    if (fetchErr || !comm) {
      return NextResponse.json({ success: false, error: 'Community not found' }, { status: 404 });
    }

    // Permission check: caller must be creator, admin, or founder
    const roles: Record<string, string> = comm.roles || {};
    const callerRole = roles[user.id] || (comm.created_by === user.id ? 'founder' : null);
    const isPrivileged = callerRole === 'founder' || callerRole === 'admin' || user.role === 'PLATFORM_ADMIN';

    if (!isPrivileged) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin permissions required' }, { status: 403 });
    }

    let members: string[] = Array.isArray(comm.members) ? comm.members : [];
    const settings = comm.settings || {};
    let pendingRequests: string[] = Array.isArray(settings.pending_requests) ? settings.pending_requests : [];

    // Remove from pending
    pendingRequests = pendingRequests.filter((uid) => uid !== targetUserId);

    if (action === 'APPROVE') {
      if (!members.includes(targetUserId)) {
        members.push(targetUserId);
      }

      // Notify approved user
      await NotificationService.createNotification({
        recipientId: targetUserId,
        senderId: user.id,
        senderName: user.fullName,
        senderAvatar: user.avatarUrl,
        type: 'COMMUNITY_APPROVE',
        title: 'Community Join Approved',
        body: `Your request to join ${comm.name} was approved!`,
        targetUrl: `/communities/${comm.id}`,
        communityId: comm.id,
      });
    }

    const newStats = {
      ...(comm.stats || {}),
      members_count: Math.max(0, members.length),
    };

    const { error: updateErr } = await supabase
      .from('communities')
      .update({
        members,
        settings: { ...settings, pending_requests: pendingRequests },
        stats: newStats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', communityId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      targetUserId,
      memberCount: members.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
