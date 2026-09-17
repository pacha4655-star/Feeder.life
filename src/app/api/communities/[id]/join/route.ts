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
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: comm, error: fetchErr } = await supabase
      .from('communities')
      .select('id, name, created_by, is_private, settings, members, stats')
      .eq('id', communityId)
      .single();

    if (fetchErr || !comm) {
      return NextResponse.json({ success: false, error: 'Community not found' }, { status: 404 });
    }

    let members: string[] = Array.isArray(comm.members) ? comm.members : [];
    const settings = comm.settings || {};
    let pendingRequests: string[] = Array.isArray(settings.pending_requests) ? settings.pending_requests : [];

    const isMember = members.includes(user.id);
    const isPending = pendingRequests.includes(user.id);

    // Private Community Flow
    if (comm.is_private && !isMember) {
      if (isPending) {
        // Cancel join request
        pendingRequests = pendingRequests.filter((uid) => uid !== user.id);
        await supabase
          .from('communities')
          .update({
            settings: { ...settings, pending_requests: pendingRequests },
            updated_at: new Date().toISOString(),
          })
          .eq('id', communityId);

        return NextResponse.json({ success: true, isJoined: false, isPending: false });
      } else {
        // Submit join request
        pendingRequests.push(user.id);
        await supabase
          .from('communities')
          .update({
            settings: { ...settings, pending_requests: pendingRequests },
            updated_at: new Date().toISOString(),
          })
          .eq('id', communityId);

        // Notify community owner/admin
        if (comm.created_by && comm.created_by !== user.id) {
          await NotificationService.createNotification({
            recipientId: comm.created_by,
            senderId: user.id,
            senderName: user.fullName,
            senderAvatar: user.avatarUrl,
            type: 'COMMUNITY_REQUEST',
            title: 'Community Join Request',
            body: `${user.fullName} requested to join ${comm.name}.`,
            targetUrl: `/communities/${comm.id}`,
            communityId: comm.id,
          });
        }

        return NextResponse.json({ success: true, isJoined: false, isPending: true });
      }
    }

    // Public Community Flow (or leaving existing membership)
    let isJoined = false;
    if (isMember) {
      // Leave group (unless owner)
      if (comm.created_by === user.id && members.length === 1) {
        return NextResponse.json({
          success: false,
          error: 'Community founder cannot leave without transferring ownership.',
        }, { status: 400 });
      }
      members = members.filter((m) => m !== user.id);
      isJoined = false;
    } else {
      // Join group
      members.push(user.id);
      isJoined = true;

      // Notify community founder
      if (comm.created_by && comm.created_by !== user.id) {
        await NotificationService.createNotification({
          recipientId: comm.created_by,
          senderId: user.id,
          senderName: user.fullName,
          senderAvatar: user.avatarUrl,
          type: 'COMMUNITY_JOIN',
          title: 'New Community Member',
          body: `${user.fullName} joined ${comm.name}.`,
          targetUrl: `/communities/${comm.id}`,
          communityId: comm.id,
        });
      }
    }

    const newStats = {
      ...(comm.stats || {}),
      members_count: Math.max(0, members.length),
    };

    const { error: updateErr } = await supabase
      .from('communities')
      .update({
        members,
        stats: newStats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', communityId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      isJoined,
      isPending: false,
      memberCount: members.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
