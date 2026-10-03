import { getSupabaseServerClient } from '../supabase/server';
import { FEEDER_RECOMMENDATION_CONFIG_V1, RecommendationConfig, AnimalWelfareTopic } from './config';
import { ContentAnalyzer } from './content-analyzer';
import { UserProfileService, UserAffinityProfile } from './user-profile';
import type { PostWithAuthor, FeedQueryOptions, FeedResponse } from '../services/feed-ranking';

export interface ScoreBreakdown {
  interestScore: number;
  watchScore: number;
  engagementScore: number;
  authorAffinityScore: number;
  shareScore: number;
  saveScore: number;
  freshnessScore: number;
  qualityScore: number;
  discoveryScore: number;
  negativePenalty: number;
  finalScore: number;
  topics: AnimalWelfareTopic[];
}

export interface RankedPostItem extends PostWithAuthor {
  ranking_debug?: ScoreBreakdown;
}

export class FeederRecommendationEngine {
  private static config: RecommendationConfig = FEEDER_RECOMMENDATION_CONFIG_V1;

  /**
   * Sets custom/dynamic configuration (e.g. for experimentation/versioning).
   */
  static setConfig(customConfig: RecommendationConfig) {
    this.config = customConfig;
  }

  /**
   * Returns current active configuration.
   */
  static getConfig(): RecommendationConfig {
    return this.config;
  }

  /**
   * Main recommendation pipeline:
   * 1. Candidate Retrieval -> 2. Feature Extraction -> 3. Multi-Factor Scoring -> 4. Diversity Re-ranking -> 5. Pagination
   */
  static async getPersonalizedFeed(
    options: FeedQueryOptions & { debug?: boolean }
  ): Promise<FeedResponse> {
    const limit = Math.min(Math.max(1, options.limit || 20), 50);
    const userId = options.userId || 'guest';
    const supabase = getSupabaseServerClient();

    try {
      // 1. Fetch user's affinity profile
      const userProfile: UserAffinityProfile = await UserProfileService.getUserAffinityProfile(userId);

      // 2. STAGE 1: Candidate Generation
      // Query recent active posts
      let query = supabase
        .from('social_posts')
        .select('*')
        .eq('record_type', 'post')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(120);

      const { data: candidateRows, error: candError } = await query;

      if (candError || !candidateRows || candidateRows.length === 0) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      // Filter out posts explicitly hidden by the user
      const hiddenSet = new Set(userProfile.hiddenPostIds);
      const activeCandidates = candidateRows.filter((p) => !hiddenSet.has(p.id));

      // 3. Bulk fetch author profiles & communities in parallel
      const authorIds = Array.from(new Set(activeCandidates.map((p) => p.user_id).filter(Boolean)));
      const communityIds = Array.from(new Set(activeCandidates.map((p) => p.community_id).filter(Boolean)));

      const [usersResult, commsResult] = await Promise.all([
        authorIds.length > 0
          ? supabase
              .from('users')
              .select('id, username, display_name, avatar_url, is_verified, profile_data')
              .in('id', authorIds)
          : Promise.resolve({ data: [] }),
        communityIds.length > 0
          ? supabase
              .from('communities')
              .select('id, name, slug, avatar_url, is_verified')
              .in('id', communityIds)
          : Promise.resolve({ data: [] }),
      ]);

      const usersMap = new Map<string, any>((usersResult.data || []).map((u: any) => [u.id, u]));
      const commsMap = new Map<string, any>((commsResult.data || []).map((c: any) => [c.id, c]));

      // 4. STAGE 2 & 3: Feature Extraction and Multi-Factor Scoring
      const scoredItems: RankedPostItem[] = [];
      const now = Date.now();
      const weights = this.config.weights;

      for (const row of activeCandidates) {
        const author = usersMap.get(row.user_id);
        const community = row.community_id ? commsMap.get(row.community_id) : undefined;

        const mediaList = Array.isArray(row.media) ? row.media : [];
        const mediaUrls = mediaList.map((m: any) => (typeof m === 'string' ? m : m.url)).filter(Boolean);
        const tags = Array.isArray(row.hashtags) ? row.hashtags : [];
        const postData = (row.data && typeof row.data === 'object' ? row.data : {}) as any;

        const postContentType =
          postData.content_type ||
          (mediaList.some((m: any) => m.type === 'video' || /\.(mp4|webm|mov)/i.test(m.url || ''))
            ? 'VIDEO'
            : 'TEXT');

        // Apply Tab Filter
        if (options.tab === 'REELS' && postContentType !== 'VIDEO' && !mediaUrls.some((u: string) => /\.(mp4|webm|mov)/i.test(u))) {
          continue;
        }
        if (options.tab === 'FEEDING' && postContentType !== 'FEEDING_UPDATE') {
          continue;
        }
        if (options.tab === 'SOS' && postContentType !== 'HELP_REQUEST' && postContentType !== 'SOS_PREVIEW') {
          continue;
        }
        if (options.tab === 'FOLLOWING' && !userProfile.followedAuthorIds.has(row.user_id)) {
          continue;
        }

        // A. Extract topics
        const topics = ContentAnalyzer.extractTopics({
          content: row.content,
          hashtags: tags,
          title: postData.title,
          contentType: postContentType,
          animalType: postData.animal_type,
        });

        // B. Compute Signal Scores (Normalized 0.0 - 1.0)
        // 1. Interest Score: affinity overlap
        let rawInterest = 0;
        for (const t of topics) {
          rawInterest += userProfile.topicAffinities[t] || 0.15; // default modest baseline
        }
        const interestScore = Math.min(1.0, rawInterest / Math.max(1, topics.length));

        // 2. Watch Score: expected video completion / dwell affinity
        const isVideo = postContentType === 'VIDEO' || mediaUrls.some((u: string) => /\.(mp4|webm|mov)/i.test(u));
        const watchScore = isVideo
          ? Math.min(1.0, 0.4 + (userProfile.topicAffinities['educational'] || 0.2) * 0.5)
          : Math.min(1.0, 0.5 + (mediaList.length > 0 ? 0.2 : 0));

        // 3. Engagement Velocity Score
        const reactionsObj = (row.reactions && typeof row.reactions === 'object' ? row.reactions : {}) as Record<string, any>;
        const reactionCount = typeof row.likes_count === 'number'
          ? row.likes_count
          : (typeof row.stats?.likes_count === 'number'
              ? row.stats.likes_count
              : Object.keys(reactionsObj).length);
        const commentCount = typeof row.comments_count === 'number'
          ? row.comments_count
          : (typeof row.comments?.count === 'number'
              ? row.comments.count
              : (typeof row.stats?.comments_count === 'number' ? row.stats.comments_count : 0));
        const shareCount = typeof row.stats?.shares_count === 'number' ? row.stats.shares_count : 0;
        const savesCount = typeof row.stats?.saves_count === 'number' ? row.stats.saves_count : 0;

        const postAgeHours = Math.max(0.1, (now - new Date(row.created_at).getTime()) / (1000 * 60 * 60));
        const rawVelocity = (reactionCount * 2 + commentCount * 4 + shareCount * 6 + savesCount * 5) / Math.pow(postAgeHours + 1, 0.7);
        const engagementScore = Math.min(1.0, rawVelocity / 25);

        // 4. Author Affinity Score
        const isFollowed = userProfile.followedAuthorIds.has(row.user_id);
        const priorAuthorAffinity = userProfile.authorAffinities[row.user_id] || 0;
        const authorAffinityScore = Math.min(1.0, (isFollowed ? 0.5 : 0) + priorAuthorAffinity * 0.5);

        // 5. Share & Save Scores
        const shareScore = Math.min(1.0, shareCount / 10);
        const saveScore = Math.min(1.0, savesCount / 8);

        // 6. Freshness Score with exponential decay
        const freshnessScore = Math.exp(-postAgeHours / this.config.freshnessDecayHours);

        // 7. Quality Score
        const qualityScore = ContentAnalyzer.computeQualityScore({
          content: row.content,
          media: mediaList,
          author,
          hashtags: tags,
        });

        // 8. Discovery Score: Exploration boost for new/fresh content with low interactions
        const isFreshColdStart = postAgeHours < 48 && reactionCount < 5 && commentCount < 2;
        const discoveryScore = isFreshColdStart ? 0.85 : 0.15;

        // 9. Negative Penalty: checks if topics match user's negative topics
        let negativePenalty = 0;
        for (const t of topics) {
          if (userProfile.negativeTopics[t]) {
            negativePenalty += userProfile.negativeTopics[t]! * 0.4;
          }
        }
        negativePenalty = Math.min(0.8, negativePenalty);

        // Compute Weighted Final Score
        const weightedScore =
          weights.interest * interestScore +
          weights.watch * watchScore +
          weights.engagement * engagementScore +
          weights.authorAffinity * authorAffinityScore +
          weights.share * shareScore +
          weights.save * saveScore +
          weights.freshness * freshnessScore +
          weights.quality * qualityScore +
          weights.discovery * discoveryScore -
          negativePenalty;

        const finalScore = Math.max(0.01, Math.round(weightedScore * 1000) / 1000);

        const userReaction =
          userId && userId !== 'guest' && reactionsObj[userId]
            ? typeof reactionsObj[userId] === 'string'
              ? reactionsObj[userId]
              : reactionsObj[userId].type || 'CARE'
            : null;

        const debugBreakdown: ScoreBreakdown = {
          interestScore: Math.round(interestScore * 100) / 100,
          watchScore: Math.round(watchScore * 100) / 100,
          engagementScore: Math.round(engagementScore * 100) / 100,
          authorAffinityScore: Math.round(authorAffinityScore * 100) / 100,
          shareScore: Math.round(shareScore * 100) / 100,
          saveScore: Math.round(saveScore * 100) / 100,
          freshnessScore: Math.round(freshnessScore * 100) / 100,
          qualityScore: Math.round(qualityScore * 100) / 100,
          discoveryScore: Math.round(discoveryScore * 100) / 100,
          negativePenalty: Math.round(negativePenalty * 100) / 100,
          finalScore,
          topics,
        };

        scoredItems.push({
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
          approx_lat: postData.approx_lat ?? row.location?.lat,
          approx_lon: postData.approx_lon ?? row.location?.lon,
          visibility: row.visibility || 'public',
          reaction_count: reactionCount,
          comment_count: commentCount,
          share_count: shareCount,
          user_reaction: userReaction,
          is_saved: false,
          created_at: row.created_at,
          ranking_score: finalScore,
          ranking_debug: options.debug ? debugBreakdown : undefined,
        });
      }

      // Initial sort by finalScore descending
      scoredItems.sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));

      // 5. STAGE 4: Diversity & De-duplication Re-ranking
      const diversifiedItems = this.applyDiversityReranking(scoredItems);

      // 6. STAGE 5: Cursor-based Pagination
      let filtered = diversifiedItems;
      if (options.cursor) {
        try {
          const decoded = Buffer.from(options.cursor, 'base64').toString('utf8');
          const [cursorScoreStr, cursorId] = decoded.split(':::');
          const cursorScore = parseFloat(cursorScoreStr);

          const cursorIdx = diversifiedItems.findIndex(
            (p) =>
              p.id === cursorId ||
              (p.ranking_score !== undefined && p.ranking_score < cursorScore)
          );

          if (cursorIdx !== -1) {
            filtered = diversifiedItems.slice(cursorIdx + 1);
          }
        } catch {
          filtered = diversifiedItems;
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
    } catch (err) {
      console.error('[FeederRecommendationEngine] Error generating personalized feed:', err);
      return { items: [], nextCursor: null, hasMore: false };
    }
  }

  /**
   * Applies diversity rules:
   * - Limits consecutive posts from the same author to maxConsecutiveSameAuthor (default 2).
   * - Blends exploration candidates to avoid cold-start starvation.
   */
  private static applyDiversityReranking(items: RankedPostItem[]): RankedPostItem[] {
    if (items.length <= 3) return items;

    const result: RankedPostItem[] = [];
    const remaining = [...items];
    const authorConsecutiveCount: Record<string, number> = {};
    let lastAuthorId: string | null = null;

    while (remaining.length > 0) {
      let chosenIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const authorId = candidate.author_id;

        if (authorId === lastAuthorId) {
          const currentCount = authorConsecutiveCount[authorId] || 1;
          if (currentCount >= this.config.diversity.maxConsecutiveSameAuthor) {
            // Skip this candidate for now to preserve author diversity
            continue;
          }
        }

        chosenIndex = i;
        break;
      }

      // Fallback if all candidates are from the same author
      if (chosenIndex === -1) {
        chosenIndex = 0;
      }

      const [selected] = remaining.splice(chosenIndex, 1);
      result.push(selected);

      if (selected.author_id === lastAuthorId) {
        authorConsecutiveCount[selected.author_id] = (authorConsecutiveCount[selected.author_id] || 1) + 1;
      } else {
        lastAuthorId = selected.author_id;
        authorConsecutiveCount[selected.author_id] = 1;
      }
    }

    return result;
  }
}
