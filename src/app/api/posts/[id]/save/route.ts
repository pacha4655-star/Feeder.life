import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existingRows } = await supabase
      .from('platform_data')
      .select('id')
      .eq('data_type', 'saved_post')
      .eq('user_id', user.id)
      .eq('target_id', postId);

    const existing = existingRows && existingRows[0];
    let isSaved = false;

    if (existing) {
      await supabase.from('platform_data').delete().eq('id', existing.id);
      isSaved = false;
    } else {
      await supabase.from('platform_data').insert({
        data_type: 'saved_post',
        user_id: user.id,
        target_id: postId,
        status: 'saved',
        data: { created_at: new Date().toISOString() },
      });
      isSaved = true;
    }

    return NextResponse.json({ success: true, isSaved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
