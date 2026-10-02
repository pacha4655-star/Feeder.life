import { getSupabaseServerClient } from '../supabase/server';
import { ImpactService } from './impact';

export interface ProfileDataResult {
  profileUser: {
    id: string;
    firebase_uid?: string;
    email?: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    bio: string;
    city: string;
    area_name: string;
    feeder_level: string;
    feeding_count: number;
    sos_responses_count: number;
    community_contributions_count: number;
    streak: any;
    cover_url: string | null;
    badges: string[];
    created_at: string;
  };
  posts: Array<{
    id: string;
    author_id: string;
    author_name: string;
    author_username: string;
    author_avatar: string;
    author_role: string;
    content_type: string;
    title: string;
    body: string;
    media_urls: string[];
    tags: string[];
    location_name: string;
    reaction_count: number;
    comment_count: number;
    created_at: string;
    user_reaction: null;
  }>;
  feedingLogs: Array<{
    id: string;
    user_id: string;
    user_name: string;
    user_avatar: string | null;
    animal_type: string;
    animal_count: number;
    food_type: string;
    fed_at: string;
  }>;
}

export class ProfileService {
  /**
   * Resolves a user profile by username, Supabase UUID, or Firebase UID.
   * If targetIdentifier is 'me' or 'current', resolves using currentUserId.
   */
  static async getProfileData(
    targetIdentifier: string,
    currentUserId?: string
  ): Promise<ProfileDataResult | null> {
    const supabase = getSupabaseServerClient();
    const cleanTarget = decodeURIComponent(targetIdentifier).replace(/^@/, '').trim();

    if (!cleanTarget) return null;

    let supaUser: any = null;

    // 1. If explicit 'me' or 'profile', resolve to current logged-in user
    if ((cleanTarget === 'me' || cleanTarget === 'profile') && currentUserId) {
      const { data: currentRows } = await supabase
        .from('users')
        .select('id, firebase_uid, email, username, display_name, avatar_url, role, bio, city, profile_data, created_at')
        .eq('id', currentUserId)
        .limit(1);
      supaUser = currentRows && currentRows[0];
    }

    // 2. Try match by username (case-insensitive)
    if (!supaUser) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, firebase_uid, email, username, display_name, avatar_url, role, bio, city, profile_data, created_at')
        .ilike('username', cleanTarget)
        .limit(1);
      supaUser = userRows && userRows[0];
    }

    // 3. Try match by Supabase UUID
    if (!supaUser) {
      const { data: idRows } = await supabase
        .from('users')
        .select('id, firebase_uid, email, username, display_name, avatar_url, role, bio, city, profile_data, created_at')
        .eq('id', cleanTarget)
        .limit(1);
      supaUser = idRows && idRows[0];
    }

    // 4. Try match by Firebase UID
    if (!supaUser) {
      const { data: uidRows } = await supabase
        .from('users')
        .select('id, firebase_uid, email, username, display_name, avatar_url, role, bio, city, profile_data, created_at')
        .eq('firebase_uid', cleanTarget)
        .limit(1);
      supaUser = uidRows && uidRows[0];
    }

    // 5. If still not found and cleanTarget matches currentUserId, resolve to current user
    if (!supaUser && currentUserId && cleanTarget === currentUserId) {
      const { data: currentRows } = await supabase
        .from('users')
        .select('id, firebase_uid, email, username, display_name, avatar_url, role, bio, city, profile_data, created_at')
        .eq('id', currentUserId)
        .limit(1);
      supaUser = currentRows && currentRows[0];
    }

    if (!supaUser) {
      return null;
    }

    // Calculate real server-verified impact summary
    const impactSummary = await ImpactService.getUserImpact(supaUser.id);

    const earnedBadges = impactSummary.badges
      .filter((b) => b.isEarned)
      .map((b) => b.name);

    const profileUser = {
      id: supaUser.id,
      firebase_uid: supaUser.firebase_uid,
      email: supaUser.email,
      username: supaUser.username || supaUser.id,
      full_name: supaUser.display_name || supaUser.username || 'Animal Guardian',
      avatar_url: supaUser.avatar_url,
      role: supaUser.role || 'USER',
      bio: supaUser.bio || '',
      city: supaUser.city || '',
      area_name: supaUser.profile_data?.area_name || '',
      feeder_level:
        supaUser.profile_data?.feeder_level ||
        (impactSummary.totalFeedingActivities > 20 ? 'Senior Feeder' : 'Grassroots Feeder'),
      feeding_count: impactSummary.totalFeedingActivities,
      sos_responses_count: impactSummary.totalSosResponses,
      community_contributions_count:
        impactSummary.totalAdoptionsSupported + impactSummary.totalLostFoundReports,
      streak: impactSummary.streak,
      cover_url: supaUser.profile_data?.cover_image_url || (supaUser as any).cover_url || null,
      badges: earnedBadges.length > 0 ? earnedBadges : ['Welfare Advocate'],
      created_at: supaUser.created_at,
    };

    // User posts from Supabase
    const { data: postRows } = await supabase
      .from('social_posts')
      .select(
        'id, user_id, post_type, title, content, media, tags, location_name, likes_count, comments_count, created_at, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, role)'
      )
      .eq('user_id', supaUser.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    const posts = (postRows || []).map((p: any) => ({
      id: p.id,
      author_id: p.user_id,
      author_name: p.users?.display_name || profileUser.full_name,
      author_username: p.users?.username || profileUser.username,
      author_avatar: p.users?.avatar_url || profileUser.avatar_url || '',
      author_role: p.users?.role || 'COMMUNITY_MEMBER',
      content_type: p.post_type || 'GENERAL',
      title: p.title || '',
      body: p.content || '',
      media_urls: Array.isArray(p.media)
        ? p.media.map((m: any) => (typeof m === 'string' ? m : m.url))
        : [],
      tags: Array.isArray(p.tags) ? p.tags : [],
      location_name: p.location_name || '',
      reaction_count: p.likes_count || 0,
      comment_count: p.comments_count || 0,
      created_at: p.created_at,
      user_reaction: null,
    }));

    // User feeding logs
    const { data: feedingRows } = await supabase
      .from('social_posts')
      .select('id, user_id, created_at, content, data')
      .eq('user_id', supaUser.id)
      .eq('post_type', 'feeding')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    const feedingLogs = (feedingRows || []).map((f: any) => ({
      id: f.id,
      user_id: f.user_id,
      user_name: profileUser.full_name,
      user_avatar: profileUser.avatar_url,
      animal_type: 'Canine',
      animal_count: 5,
      food_type: 'Boiled Rice & Chicken',
      fed_at: f.created_at,
    }));

    return {
      profileUser,
      posts,
      feedingLogs,
    };
  }
}
