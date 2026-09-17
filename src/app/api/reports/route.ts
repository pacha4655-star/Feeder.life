import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { targetType, targetId, reason, details } = body;

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ success: false, error: 'Target and reason required' }, { status: 400 });
    }

    const reportId = `rep_${Date.now()}`;
    const supabase = getSupabaseServerClient();

    const { error: insertErr } = await supabase.from('platform_data').insert({
      id: reportId,
      data_type: 'report',
      user_id: user.id,
      target_id: targetId,
      status: 'PENDING',
      data: {
        target_type: targetType,
        reason,
        details: details || null,
        created_at: new Date().toISOString(),
      },
    });

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, reportId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
