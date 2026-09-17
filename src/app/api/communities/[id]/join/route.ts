import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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
      .select('id, members, stats')
      .eq('id', communityId)
      .single();

    if (fetchErr || !comm) {
      return NextResponse.json({ success: false, error: 'Community not found' }, { status: 404 });
    }

    let members: string[] = Array.isArray(comm.members) ? comm.members : [];
    let isJoined = members.includes(user.id);

    if (isJoined) {
      members = members.filter((m) => m !== user.id);
      isJoined = false;
    } else {
      members.push(user.id);
      isJoined = true;
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
      })
      .eq('id', communityId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, isJoined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
