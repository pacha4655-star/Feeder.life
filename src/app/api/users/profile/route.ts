import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { DbUser } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: supaUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !supaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const u = supaUser as DbUser;
    const profile = {
      id: u.id,
      firebaseUid: u.firebase_uid,
      email: u.email,
      username: u.username,
      full_name: u.display_name || u.username,
      avatar_url: u.avatar_url,
      cover_url: u.profile_data?.cover_image_url || (u as any).cover_url || null,
      bio: u.bio || '',
      city: u.city || '',
      area_name: u.profile_data?.area_name || '',
      feeder_level: u.profile_data?.feeder_level || 'Grassroots Feeder',
      feeding_count: u.profile_data?.feeding_count || 0,
      sos_count: u.profile_data?.sos_count || 0,
      role: u.profile_data?.role || (u as any).role || 'USER',
      onboarding_completed: u.onboarding_completed ?? false,
      interests: u.interests || [],
      created_at: u.created_at,
    };
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { fullName, bio, areaName, city, avatarUrl, coverUrl, username } = body;
    let cleanUsername: string | undefined = undefined;

    if (username !== undefined) {
      const trimmed = (username || '').trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Username is required.' }, { status: 400 });
      }
      if (trimmed.length < 3) {
        return NextResponse.json({ success: false, error: 'Username is too short.' }, { status: 400 });
      }
      if (trimmed.length > 30) {
        return NextResponse.json({ success: false, error: 'Username is too long.' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return NextResponse.json(
          { success: false, error: 'Username can only contain letters, numbers, and underscores.' },
          { status: 400 }
        );
      }

      cleanUsername = trimmed.toLowerCase();

      // Enforce case-insensitive uniqueness
      if (cleanUsername && cleanUsername !== user.username?.toLowerCase()) {
        const supabase = getSupabaseServerClient();
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, username')
          .ilike('username', cleanUsername)
          .neq('id', user.id)
          .maybeSingle();

        if (existingUser) {
          return NextResponse.json({ success: false, error: 'This username is already taken.' }, { status: 409 });
        }
      }
    }

    const supabase = getSupabaseServerClient();
    const { data: currentUserData } = await supabase
      .from('users')
      .select('profile_data')
      .eq('id', user.id)
      .maybeSingle();

    const existingProfileData = currentUserData?.profile_data || {};
    const updatedProfileData = {
      ...existingProfileData,
      area_name: areaName !== undefined ? areaName : existingProfileData.area_name,
      avatar_url: avatarUrl !== undefined ? avatarUrl : existingProfileData.avatar_url,
      cover_image_url: coverUrl !== undefined ? coverUrl : existingProfileData.cover_image_url,
    };

    const updatePayload: Record<string, any> = {
      profile_data: updatedProfileData,
      updated_at: new Date().toISOString(),
    };
    if (cleanUsername !== undefined) updatePayload.username = cleanUsername;
    if (fullName !== undefined) updatePayload.display_name = fullName;
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;
    if (bio !== undefined) updatePayload.bio = bio;
    if (city !== undefined) updatePayload.city = city;

    const { error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        username: cleanUsername || user.username,
        fullName: fullName !== undefined ? fullName : user.fullName,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
        coverUrl: coverUrl !== undefined ? coverUrl : (user as any).coverUrl || null,
        bio: bio !== undefined ? bio : user.bio,
        city: city !== undefined ? city : user.city,
        areaName: areaName !== undefined ? areaName : user.areaName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Unable to update profile. Please try again.' }, { status: 500 });
  }
}
