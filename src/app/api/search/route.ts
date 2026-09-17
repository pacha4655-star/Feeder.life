import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = (searchParams.get('q') || '').trim();

    // Sanitize query to prevent PostgREST syntax errors with special chars
    const sanitized = rawQuery.replace(/[%_,()"]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!sanitized) {
      return NextResponse.json({
        success: true,
        query: rawQuery,
        results: { people: [], communities: [], posts: [], sos: [] },
      });
    }

    const supabase = getSupabaseServerClient();

    // 1. Search Real Users (public profile fields only, zero sensitive data leakage)
    const { data: userRows, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, city, is_verified, profile_data')
      .eq('is_active', true)
      .or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`)
      .limit(8);

    const people = (userRows || [])
      .filter((u: any) => u.username) // Ensure valid username for profile routing
      .map((u: any) => ({
        id: u.id,
        username: u.username,
        full_name: u.display_name || u.username,
        avatar_url: u.avatar_url || null,
        area_name: u.city || u.profile_data?.city || '',
        is_verified: !!u.is_verified,
        feeder_level: u.profile_data?.feeder_level || 'Animal Guardian',
      }));

    // 2. Search Real Communities
    const { data: commRows } = await supabase
      .from('communities')
      .select('id, name, slug, description, community_type, city, avatar_url, members, stats')
      .eq('is_active', true)
      .or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
      .limit(6);

    const communities = (commRows || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      category: c.community_type || 'COMMUNITY',
      location_area: c.city || '',
      avatar_image: c.avatar_url,
      member_count: Array.isArray(c.members) ? c.members.length : (c.stats?.members_count || 1),
    }));

    // 3. Search Real Posts
    const { data: postRows } = await supabase
      .from('social_posts')
      .select('id, user_id, content, data, stats, created_at')
      .eq('record_type', 'post')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .ilike('content', `%${sanitized}%`)
      .order('created_at', { ascending: false })
      .limit(6);

    let posts: any[] = [];
    if (postRows && postRows.length > 0) {
      const userIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean)));
      const { data: authors } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      const authorMap = new Map((authors || []).map((a: any) => [a.id, a]));

      posts = postRows.map((p: any) => {
        const author = authorMap.get(p.user_id);
        return {
          id: p.id,
          title: p.data?.title || '',
          body: p.content || '',
          content_type: p.data?.content_type || 'GENERAL',
          location_name: p.data?.location_name || '',
          reaction_count: p.stats?.likes_count || 0,
          comment_count: p.stats?.comments_count || 0,
          author_name: author?.display_name || author?.username || 'Animal Guardian',
          author_username: author?.username || '',
          author_avatar: author?.avatar_url || '',
        };
      });
    }

    // 4. Search Real Animals / SOS Cases
    const { data: animalRows } = await supabase
      .from('animals')
      .select('id, name, species, city, status, created_at, sos_data')
      .or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,species.ilike.%${sanitized}%`)
      .order('created_at', { ascending: false })
      .limit(6);

    const sos = (animalRows || []).map((a: any) => ({
      id: a.id,
      title: a.name || a.sos_data?.title || 'Emergency Case',
      emergency_type: a.sos_data?.emergency_type || 'INJURED_ANIMAL',
      urgency: a.sos_data?.urgency || 'HIGH',
      animal_type: a.species,
      approx_location_name: a.city || a.sos_data?.approx_location_name || '',
      status: a.status || 'OPEN',
      created_at: a.created_at,
    }));

    return NextResponse.json({
      success: true,
      query: rawQuery,
      results: { people, communities, posts, sos },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
