import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ success: true, results: { people: [], communities: [], posts: [], sos: [] } });
    }

    const supabase = getSupabaseServerClient();

    // 1. Search Users
    const { data: userRows } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, role, city')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(6);

    const people = (userRows || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      full_name: u.display_name || u.username,
      avatar_url: u.avatar_url,
      role: u.role,
      area_name: u.city || '',
      feeder_level: 'Community Member',
    }));

    // 2. Search Communities
    const { data: commRows } = await supabase
      .from('communities')
      .select('id, name, slug, description, community_type, city, avatar_url, members, stats')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(6);

    const communities = (commRows || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      category: c.community_type || 'COMMUNITY',
      location_area: c.city || '',
      avatar_image: c.avatar_url,
      member_count: Array.isArray(c.members) ? c.members.length : (c.stats?.members_count || 1),
    }));

    // 3. Search Posts
    const { data: postRows } = await supabase
      .from('social_posts')
      .select('id, title, content, post_type, location_name, likes_count, comments_count, users!social_posts_user_id_fkey(display_name, avatar_url)')
      .eq('is_deleted', false)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,location_name.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(6);

    const posts = (postRows || []).map((p: any) => ({
      id: p.id,
      title: p.title || '',
      body: p.content || '',
      content_type: p.post_type || 'GENERAL',
      location_name: p.location_name || '',
      reaction_count: p.likes_count || 0,
      comment_count: p.comments_count || 0,
      author_name: p.users?.display_name || 'Member',
      author_avatar: p.users?.avatar_url || '',
    }));

    // 4. Search SOS / Animal cases
    const { data: animalRows } = await supabase
      .from('animals')
      .select('id, name, species, city, status, created_at, sos_data')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,species.ilike.%${query}%`)
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
      query,
      results: { people, communities, posts, sos },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
