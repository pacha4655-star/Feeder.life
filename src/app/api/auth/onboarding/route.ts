import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { bio, areaName, city, avatarUrl, feederRole } = body;

    const supabase = getSupabaseServerClient();
    const { data: currentUserData } = await supabase
      .from('users')
      .select('profile_data')
      .eq('id', user.id)
      .maybeSingle();

    const existingProfileData = currentUserData?.profile_data || {};

    const { error: supaErr } = await supabase
      .from('users')
      .update({
        bio: bio !== undefined ? bio : undefined,
        city: city !== undefined ? city : undefined,
        avatar_url: avatarUrl || undefined,
        onboarding_completed: true,
        profile_data: {
          ...existingProfileData,
          area_name: areaName || existingProfileData.area_name || null,
          feeder_role: feederRole || existingProfileData.feeder_role || 'Daily Stray Feeder',
          feeder_level: existingProfileData.feeder_level || 'Grassroots Feeder',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (supaErr) {
      return NextResponse.json({ success: false, error: supaErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
