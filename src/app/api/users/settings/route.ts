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
    const settings = u.settings || {};
    const privacySettings = u.privacy_settings || {};
    const profileData = u.profile_data || {};

    return NextResponse.json({
      success: true,
      settings: {
        // Account & Personal
        phone: profileData.phone || '',
        dob: profileData.dob || '',
        personalVisibility: privacySettings.personal_visibility || 'public',
        
        // Privacy
        profileVisibility: privacySettings.profile_visibility || 'public',
        postVisibility: privacySettings.post_visibility || 'public',
        whoCanFollow: privacySettings.who_can_follow || 'everyone',
        whoCanMessage: privacySettings.who_can_message || 'everyone',
        whoCanComment: privacySettings.who_can_comment || 'everyone',
        whoCanTag: privacySettings.who_can_tag || 'everyone',
        tagReview: privacySettings.tag_review ?? true,
        showApproxLocation: privacySettings.show_approx_location ?? true,
        publicDirectory: privacySettings.public_directory ?? true,
        blockedUsers: privacySettings.blocked_users || [],

        // Notifications - Push
        pushLikes: settings.push_likes ?? true,
        pushComments: settings.push_comments ?? true,
        pushFollowers: settings.push_followers ?? true,
        pushMessages: settings.push_messages ?? true,
        pushCommunities: settings.push_communities ?? true,
        pushAdoption: settings.push_adoption ?? true,
        pushRescue: settings.push_rescue ?? true,
        pushFeeding: settings.push_feeding ?? true,
        pushSosAlerts: true, // Emergency SOS alerts cannot be turned off by master switches

        // Notifications - Email
        emailActivity: settings.email_activity ?? true,
        emailSecurity: settings.email_security ?? true,
        emailCommunities: settings.email_communities ?? false,
        emailDigest: settings.email_digest ?? true,

        // Preferences
        feedOrder: settings.feed_order || 'recommended',
        suggestedFrequency: settings.suggested_frequency || 'moderate',
        mutedKeywords: settings.muted_keywords || ['violence', 'cruelty', 'spam'],
        language: settings.language || 'en',
        region: settings.region || 'IN',
        timezone: settings.timezone || 'Asia/Kolkata',
        dateFormat: settings.date_format || 'DD/MM/YYYY',
        timeFormat: settings.time_format || '12h',
        theme: settings.theme || 'system',
        fontSize: settings.font_size || 'medium',
        reducedMotion: settings.reduced_motion ?? false,
        highContrast: settings.high_contrast ?? false,

        // Animal & Feeder
        animalInterests: u.interests && u.interests.length > 0 ? u.interests : ['Dogs', 'Cats', 'Birds'],
        feedingSchedule: settings.feeding_schedule || '18:00',
        feedingReminderActive: settings.feeding_reminder_active ?? true,
        alertRadiusKm: settings.alert_radius_km || 5,
        adoptionSpecies: settings.adoption_species || ['Dogs', 'Cats'],
        willingToFoster: settings.willing_to_foster ?? false,
        willingToTransport: settings.willing_to_transport ?? true,
        firstAidResponder: settings.first_aid_responder ?? false,
        preferredVetClinic: settings.preferred_vet_clinic || '',

        // Communities
        communityInvitations: settings.community_invitations || 'everyone',
        communityNotifications: settings.community_notifications ?? true,
      },
    });
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
    const supabase = getSupabaseServerClient();

    const { data: supaUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!supaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentSettings = supaUser.settings || {};
    const currentPrivacy = supaUser.privacy_settings || {};
    const currentProfileData = supaUser.profile_data || {};

    const updatedSettings = {
      ...currentSettings,
      ...(body.settings || {}),
    };

    const updatedPrivacy = {
      ...currentPrivacy,
      ...(body.privacy || {}),
    };

    const updatedProfileData = {
      ...currentProfileData,
      ...(body.profileData || {}),
    };

    const updatePayload: Record<string, any> = {
      settings: updatedSettings,
      privacy_settings: updatedPrivacy,
      profile_data: updatedProfileData,
      updated_at: new Date().toISOString(),
    };

    if (Array.isArray(body.interests)) {
      updatePayload.interests = body.interests;
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
