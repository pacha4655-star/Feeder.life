import { getSupabaseServerClient } from '../supabase/server';
import { AnimalWelfareTopic, ANIMAL_WELFARE_TOPICS } from './config';

export interface UserAffinityProfile {
  userId: string;
  topicAffinities: Partial<Record<AnimalWelfareTopic, number>>; // normalized scores 0.0 - 1.0
  authorAffinities: Record<string, number>; // authorId -> score 0.0 - 1.0
  negativeTopics: Partial<Record<AnimalWelfareTopic, number>>; // penalty multiplier
  hiddenPostIds: string[];
  followedAuthorIds: Set<string>;
  totalInteractions: number;
  lastUpdated: string;
}

const affinityCache = new Map<string, { profile: UserAffinityProfile; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30s cache

export class UserProfileService {
  /**
   * Retrieves or builds the aggregated affinity profile for a user.
   * If the user is a guest or brand-new, returns a neutral baseline profile.
   */
  static async getUserAffinityProfile(userId: string): Promise<UserAffinityProfile> {
    const defaultProfile: UserAffinityProfile = {
      userId,
      topicAffinities: {},
      authorAffinities: {},
      negativeTopics: {},
      hiddenPostIds: [],
      followedAuthorIds: new Set<string>(),
      totalInteractions: 0,
      lastUpdated: new Date().toISOString(),
    };

    if (!userId || userId === 'guest') {
      return defaultProfile;
    }

    const cached = affinityCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.profile;
    }

    try {
      const supabase = getSupabaseServerClient();

      const [
        { data: affinityRows },
        { data: followRows }
      ] = await Promise.all([
        supabase
          .from('platform_data')
          .select('id, data')
          .eq('data_type', 'audit')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('platform_data')
          .select('target_id')
          .eq('data_type', 'follow')
          .eq('user_id', userId)
      ]);

      const followedAuthorIds = new Set<string>(
        (followRows || []).map((r: any) => r.target_id).filter(Boolean)
      );

      // Find user_affinity audit row
      const affinityRecord = (affinityRows || []).find((r: any) => r.data?.subtype === 'user_affinity');

      if (affinityRecord && affinityRecord.data) {
        const stored = (typeof affinityRecord.data === 'object' ? affinityRecord.data : {}) as any;
        const resolvedProfile: UserAffinityProfile = {
          userId,
          topicAffinities: stored.topicAffinities || {},
          authorAffinities: stored.authorAffinities || {},
          negativeTopics: stored.negativeTopics || {},
          hiddenPostIds: Array.isArray(stored.hiddenPostIds) ? stored.hiddenPostIds : [],
          followedAuthorIds,
          totalInteractions: stored.totalInteractions || 0,
          lastUpdated: stored.lastUpdated || new Date().toISOString(),
        };
        affinityCache.set(userId, { profile: resolvedProfile, expiresAt: Date.now() + CACHE_TTL_MS });
        return resolvedProfile;
      }

      // If no stored profile exists yet, return default with followed author set
      const defaultWithFollows = {
        ...defaultProfile,
        followedAuthorIds,
      };
      affinityCache.set(userId, { profile: defaultWithFollows, expiresAt: Date.now() + CACHE_TTL_MS });
      return defaultWithFollows;
    } catch (err) {
      console.warn('[UserProfileService] Error fetching user affinity:', err);
      return defaultProfile;
    }
  }

  /**
   * Updates user affinity based on a real interaction event.
   */
  static async recordInteraction(event: {
    userId: string;
    eventType: string;
    topics: AnimalWelfareTopic[];
    authorId?: string;
    postId?: string;
    durationMs?: number;
    completionRatio?: number;
  }): Promise<void> {
    const { userId, eventType, topics, authorId, postId, completionRatio } = event;
    if (!userId || userId === 'guest') return;

    try {
      const profile = await this.getUserAffinityProfile(userId);
      const updatedTopics = { ...profile.topicAffinities };
      const updatedAuthors = { ...profile.authorAffinities };
      const updatedNegative = { ...profile.negativeTopics };
      const updatedHidden = new Set(profile.hiddenPostIds);

      // Event weight multipliers
      let delta = 0.08;
      if (eventType === 'like') delta = 0.20;
      else if (eventType === 'comment') delta = 0.30;
      else if (eventType === 'save') delta = 0.35;
      else if (eventType === 'share') delta = 0.40;
      else if (eventType === 'video_complete' || (completionRatio && completionRatio >= 0.8)) delta = 0.25;
      else if (eventType === 'view' && event.durationMs && event.durationMs >= 2000) delta = 0.12;

      if (eventType === 'not_interested' || eventType === 'hide') {
        if (postId) updatedHidden.add(postId);
        // Apply penalty to associated topics
        for (const t of topics) {
          updatedNegative[t] = Math.min(1.0, (updatedNegative[t] || 0) + 0.5);
          if (updatedTopics[t]) {
            updatedTopics[t] = Math.max(0.0, updatedTopics[t]! - 0.25);
          }
        }
      } else {
        // Positive signal: increment topic affinities
        for (const t of topics) {
          const current = updatedTopics[t] || 0.1;
          updatedTopics[t] = Math.min(1.0, current + delta);
        }

        // Author affinity increment
        if (authorId && authorId !== userId) {
          const currentAuthor = updatedAuthors[authorId] || 0.1;
          updatedAuthors[authorId] = Math.min(1.0, currentAuthor + delta * 0.8);
        }
      }

      // Persist to platform_data with data_type = 'audit' and subtype = 'user_affinity'
      const supabase = getSupabaseServerClient();
      const updatedData = {
        subtype: 'user_affinity',
        topicAffinities: updatedTopics,
        authorAffinities: updatedAuthors,
        negativeTopics: updatedNegative,
        hiddenPostIds: Array.from(updatedHidden).slice(-100), // Keep last 100 hidden
        totalInteractions: (profile.totalInteractions || 0) + 1,
        lastUpdated: new Date().toISOString(),
      };

      const { data: existingRows } = await supabase
        .from('platform_data')
        .select('id, data')
        .eq('data_type', 'audit')
        .eq('user_id', userId)
        .limit(10);

      const existingRecord = (existingRows || []).find((r: any) => r.data?.subtype === 'user_affinity');

      if (existingRecord) {
        const { error: updateErr } = await supabase
          .from('platform_data')
          .update({ data: updatedData })
          .eq('id', existingRecord.id);
        if (updateErr) console.error('[UserProfileService] update error:', updateErr);
      } else {
        const { error: insertErr } = await supabase.from('platform_data').insert({
          data_type: 'audit',
          user_id: userId,
          target_id: userId,
          status: 'active',
          data: updatedData,
        });
        if (insertErr) console.error('[UserProfileService] insert error:', insertErr);
      }
      affinityCache.delete(userId);
    } catch (err) {
      console.warn('[UserProfileService] Error recording interaction:', err);
    }
  }
}
