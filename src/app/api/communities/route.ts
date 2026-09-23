import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isValidCommunityType } from '@/lib/validation/schemas';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';
import type { CommunityType } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from('communities')
      .select('id, name, slug, description, community_type, city, cover_url, avatar_url, is_private, rules, created_by, members, stats')
      .order('created_at', { ascending: false })
      .limit(60);

    if (category && category !== 'ALL') {
      query = query.eq('community_type', category.toLowerCase());
    }

    const { data: rows, error } = await query;
    if (error) {
      logger.error('Error fetching communities from Supabase', error);
      return NextResponse.json({ success: true, communities: [] });
    }

    const communities = (rows || []).map((c: any) => {
      const members: string[] = Array.isArray(c.members) ? c.members : [];
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        category: c.community_type || 'COMMUNITY',
        location_area: c.city || '',
        cover_image: c.cover_url,
        avatar_image: c.avatar_url,
        is_private: c.is_private ? 1 : 0,
        rules_text: Array.isArray(c.rules) ? c.rules.join('\n') : (c.rules || ''),
        created_by: c.created_by,
        member_count: members.length || c.stats?.members_count || 1,
        post_count: c.stats?.post_count || 0,
        actual_member_count: members.length || c.stats?.members_count || 1,
        is_joined: user ? members.includes(user.id) : false,
      };
    });

    return NextResponse.json({ success: true, communities });
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

    // Rate limiting: Community creation
    const rateLimit = checkRateLimit('community_create', user.id, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      description,
      communityType = 'general',
      locationArea,
      city,
      region,
      countryCode,
      coverImage,
      avatarImage,
      rulesText,
      isPrivate = 0,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Community name is required' }, { status: 400 });
    }

    const sanitizedName = sanitizeText(name).slice(0, 100);
    const sanitizedDesc = description ? sanitizeText(description).slice(0, 2000) : '';
    const validCommType: CommunityType = isValidCommunityType(communityType) ? communityType : 'general';

    const slug =
      sanitizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const supabase = getSupabaseServerClient();
    const { data: newComm, error } = await supabase
      .from('communities')
      .insert({
        name: sanitizedName,
        slug,
        description: sanitizedDesc,
        community_type: validCommType,
        city: (city || locationArea) ? sanitizeText(city || locationArea).slice(0, 100) : null,
        region: region ? sanitizeText(region).slice(0, 100) : null,
        country_code: countryCode ? sanitizeText(countryCode).toUpperCase().slice(0, 2) : null,
        avatar_url: avatarImage ? sanitizeUrl(avatarImage) : null,
        cover_url: coverImage ? sanitizeUrl(coverImage) : null,
        created_by: user.id,
        members: [user.id],
        roles: { [user.id]: 'founder' },
        rules: rulesText ? [rulesText.slice(0, 500)] : [],
        settings: { open_membership: !isPrivate },
        is_private: !!isPrivate,
        is_active: true,
        stats: { members_count: 1, post_count: 0 },
      })
      .select()
      .single();

    if (error) {
      logger.error('Error inserting community to Supabase', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    logger.info('Community created', { userId: user.id, communityId: newComm?.id, slug });

    return NextResponse.json({ success: true, communityId: newComm?.id, slug });
  } catch (error: any) {
    logger.error('Create community error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
