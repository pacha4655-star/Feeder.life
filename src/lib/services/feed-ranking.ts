import { FeederRecommendationEngine, ScoreBreakdown } from '@/lib/recommendation/engine';

export interface FeedQueryOptions {
  userId: string;
  tab?: 'FOR_YOU' | 'FOLLOWING' | 'NEARBY' | 'FEEDING' | 'SOS' | 'REELS';
  limit?: number;
  cursor?: string | null;
  userLat?: number;
  userLon?: number;
  debug?: boolean;
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
  ranking_debug?: ScoreBreakdown;
}

export class FeedRankingService {
  /**
   * Main entry point for paginated personalized feed ranking powered by FeederSense V1.0.
   */
  static async getRankedFeedPaginated(options: FeedQueryOptions): Promise<FeedResponse> {
    return FeederRecommendationEngine.getPersonalizedFeed(options);
  }

  /**
   * Backward-compatible helper returning a list of ranked posts.
   */
  static async getRankedFeed(options: FeedQueryOptions): Promise<PostWithAuthor[]> {
    const res = await FeederRecommendationEngine.getPersonalizedFeed({
      ...options,
      limit: options.limit || 50,
    });
    return res.items;
  }
}
