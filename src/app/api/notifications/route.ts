import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    const supabase = getSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'notification')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    const notifications = (rows || []).map((r: any) => ({
      id: r.id,
      recipient_id: r.user_id,
      sender_id: r.target_id || null,
      type: r.data?.type || 'SYSTEM',
      title: r.data?.title || 'Notification',
      body: r.data?.body || '',
      target_url: r.data?.target_url || '/notifications',
      is_read: r.status === 'read' ? 1 : 0,
      created_at: r.created_at,
      sender_name: r.data?.sender_name || null,
      sender_avatar: r.data?.sender_avatar || null,
    }));

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    await supabase
      .from('platform_data')
      .update({ status: 'read' })
      .eq('data_type', 'notification')
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
