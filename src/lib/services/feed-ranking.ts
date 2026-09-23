import { getSupabaseServerClient } from '../supabase/server';
import type { DbSocialPost, DbUser, DbCommunity } from '@/types/database';

export interface FeedQueryOptions {
  userId: string;
  tab?: 'FOR_YOU' | 'FOLLOWING' | 'NEARBY' | 'FEEDING' | 'SOS' | 'REELS';
  limit?: number;
  cursor?: string | null;
  userLat?: number;
  userLon?: number;
}

export interface FeedResponse {
  items: PostWithAuthor[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PostWithAuthor {
  id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  author_role: string;
  author_feeder_level?: string;
  community_id?: string;
  community_name?: string;
  community_slug?: string;
  content_type: string;
  title?: string;
  body: string;
  media_urls: string[];
  tags: string[];
  location_name?: string;
  approx_lat?: number;
  approx_lon?: number;
  distance_km?: number;
  visibility: string;
  reaction_count: number;
  comment_count: number;
  share_count: number;
  user_reaction?: string | null;
  is_saved?: boolean;
  created_at: string;
  ranking_score?: number;
}

function calculateHaversineKm(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number | undefined {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return undefined;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class FeedRankingService {
  /**
   * Deterministic multi-factor scoring engine with cursor-based pagination for Feeder.life using Supabase PostgreSQL.
   */
  static async getRankedFeedPaginated(options: FeedQueryOptions): Promise<FeedResponse> {
    const limit = Math.min(Math.max(1, options.limit || 15), 50);
    const ranked = await this.getRankedFeed(options);

    let filtered = ranked;
    if (options.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, 'base64').toString('utf8');
        const [cursorScoreStr, cursorId] = decoded.split(':::');
        const cursorScore = parseFloat(cursorScoreStr);

        const cursorIdx = ranked.findIndex(
          (p) =>
            p.id === cursorId ||
            (p.ranking_score !== undefined && p.ranking_score < cursorScore)
        );

        if (cursorIdx !== -1) {
          filtered = ranked.slice(cursorIdx + 1);
        }
      } catch {
        filtered = ranked;
      }
    }

    const items = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      const score = lastItem.ranking_score ?? 0;
      nextCursor = Buffer.from(`${score}:::${lastItem.id}`).toString('base64');
    }

    return { items, nextCursor, hasMore };
  }

  /**
   * Deterministic multi-factor scoring engine querying Supabase PostgreSQL social_posts, users, and communities.
   */
  static async getRankedFeed(options: FeedQueryOptions): Promise<PostWithAuthor[]> {
    const {
      userId,
      tab = 'FOR_YOU',
      limit = 50,
      userLat,
      userLon,
    } = options;

    try {
      const supabase = getSupabaseServerClient();

      // 1. Query candidate posts from Supabase social_posts table
      let postsQuery = supabase
        .from('social_posts')
        .select('*')
        .eq('record_type', 'post')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: rawPosts, error: postsError } = await postsQuery;

      if (postsError || !rawPosts || rawPosts.length === 0) {
        return [];
      }

      // Collect user and community IDs for bulk lookup
      const userIds = Array.from(new Set(rawPosts.map((p) => p.user_id).filter(Boolean)));
      const communityIds = Array.from(
        new Set(rawPosts.map((p) => p.community_id).filter(Boolean))
      );

      // 2. Fetch users in parallel
      const usersMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, role, is_verified, profile_data')
          .in('id', userIds);

        if (usersData) {
          usersData.forEach((u) => usersMap.set(u.id, u));
        }
      }

      // 3. Fetch communities in parallel
      const commsMap = new Map<string, any>();
      if (communityIds.length > 0) {
        const { data: commsData } = await supabase
          .from('communities')
          .select('id, name, slug, avatar_url, is_verified')
          .in('id', communityIds);

        if (commsData) {
          commsData.forEach((c) => commsMap.set(c.id, c));
        }
      }

      const now = Date.now();
      const scoredPosts: PostWithAuthor[] = [];

      for (const row of rawPosts) {
        const author = usersMap.get(row.user_id);
        const community = row.community_id ? commsMap.get(row.community_id) : undefined;

        const mediaList = Array.isArray(row.media) ? row.media : [];
        const mediaUrls = mediaList.map((m: any) => (typeof m === 'string' ? m : m.url)).filter(Boolean);
        const tags = Array.isArray(row.hashtags) ? row.hashtags : [];

        const postData = (row.data && typeof row.data === 'object' ? row.data : {}) as any;
        const postContentType = postData.content_type || (mediaList.some((m: any) => m.type === 'video' || /\.(mp4|webm|mov)/i.test(m.url || '')) ? 'VIDEO' : 'TEXT');

        // Filter by Tab if required
        if (tab === 'REELS' && postContentType !== 'VIDEO' && !mediaUrls.some((u: string) => /\.(mp4|webm|mov)/i.test(u))) {
          continue;
        }
        if (tab === 'FEEDING' && postContentType !== 'FEEDING_UPDATE') {
          continue;
        }
        if (tab === 'SOS' && postContentType !== 'HELP_REQUEST' && postContentType !== 'SOS_PREVIEW') {
          continue;
        }

        const approxLat = postData.approx_lat ?? row.location?.lat;
        const approxLon = postData.approx_lon ?? row.location?.lon;
        const distanceKm = calculateHaversineKm(userLat, userLon, approxLat, approxLon);

        if (tab === 'NEARBY' && approxLat == null) {
          continue;
        }

        // Calculate time decay: half-life of 24 hours
        const postAgeMs = Math.max(0, now - new Date(row.created_at).getTime());
        const hoursAgo = postAgeMs / (1000 * 60 * 60);
        const recencyFactor = 1 / Math.pow(1 + hoursAgo / 12, 1.3);

        const reactionsObj = (row.reactions && typeof row.reactions === 'object' ? row.reactions : {}) as Record<string, any>;
        const reactionCount = Object.values(reactionsObj).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 1), 0);
        const commentCount = typeof row.comments?.count === 'number' ? row.comments.count : 0;
        const shareCount = typeof row.stats?.shares_count === 'number' ? row.stats.shares_count : 0;

        const engagement = reactionCount * 3 + commentCount * 5 + shareCount * 8;
        const proximityBonus = distanceKm != null && distanceKm < 10 ? Math.max(0, 30 - distanceKm * 3) : 0;

        let typeWeight = 1.0;
        if (postContentType === 'FEEDING_UPDATE') typeWeight = 1.25;
        if (postContentType === 'HELP_REQUEST' || postContentType === 'SOS_PREVIEW') typeWeight = 1.4;

        const finalScore = (10 + engagement + proximityBonus) * recencyFactor * typeWeight;

        const userReaction = userId && reactionsObj[userId] ? (reactionsObj[userId].type || 'paws') : null;

        scoredPosts.push({
          id: row.id,
          author_id: row.user_id,
          author_name: author?.display_name || author?.username || 'Feeder Guardian',
          author_username: author?.username || 'feeder',
          author_avatar: author?.avatar_url || '',
          author_role: (author?.profile_data?.role as any) || 'USER',
          author_feeder_level: author?.profile_data?.feeder_level || 'Grassroots Feeder',
          community_id: row.community_id || undefined,
          community_name: community?.name || undefined,
          community_slug: community?.slug || undefined,
          content_type: postContentType,
          title: postData.title || undefined,
          body: row.content || '',
          media_urls: mediaUrls,
          tags,
          location_name: postData.location_name || undefined,
          approx_lat: approxLat,
          approx_lon: approxLon,
          distance_km: distanceKm,
          visibility: row.visibility || 'public',
          reaction_count: reactionCount,
          comment_count: commentCount,
          share_count: shareCount,
          user_reaction: userReaction,
          is_saved: false,
          created_at: row.created_at,
          ranking_score: Math.round(finalScore * 100) / 100,
        });
      }

      scoredPosts.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));

      return scoredPosts.slice(0, limit);
    } catch (err) {
      console.error('[FeedRankingService] Error querying Supabase feed:', err);
      return [];
    }
  }
}
