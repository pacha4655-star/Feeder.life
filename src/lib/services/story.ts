import { getSupabaseServerClient } from '../supabase/server';
import type { DbSocialPost, DbUser } from '@/types/database';
import crypto from 'crypto';

export interface StoryView {
  id: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  caption?: string;
  created_at: string;
  expires_at: string;
  has_viewed?: boolean;
  reactions?: Record<string, number>;
  user_reaction?: string | null;
  viewer_count?: number;
}

export interface StoryViewer {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  viewed_at: string;
}

export class StoryService {
  /**
   * Fetch active, non-expired stories from Supabase within the 24-hour window.
   */
  static async getActiveStories(viewerId?: string): Promise<StoryView[]> {
    try {
      const supabase = getSupabaseServerClient();
      const nowIso = new Date().toISOString();

      const { data: rawStories, error } = await supabase
        .from('social_posts')
        .select('id, user_id, media, content, created_at, expires_at, reactions, stats')
        .eq('record_type', 'story')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error || !rawStories || rawStories.length === 0) {
        return [];
      }

      const userIds = Array.from(new Set(rawStories.map((s) => s.user_id).filter(Boolean)));
      const usersMap = new Map<string, DbUser>();

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        if (usersData) {
          usersData.forEach((u) => usersMap.set(u.id, u as DbUser));
        }
      }

      // Fetch views for this viewer
      const storyIds = rawStories.map((s) => s.id);
      const viewedSet = new Set<string>();

      if (viewerId && storyIds.length > 0) {
        const { data: viewsData } = await supabase
          .from('platform_data')
          .select('target_id')
          .eq('data_type', 'audit')
          .eq('user_id', viewerId)
          .in('target_id', storyIds);

        if (viewsData) {
          viewsData.forEach((v) => {
            if (v.target_id) viewedSet.add(v.target_id);
          });
        }
      }

      return rawStories.map((s) => {
        const author = usersMap.get(s.user_id);
        const mediaList = Array.isArray(s.media) ? s.media : [];
        const mediaItem = mediaList[0] || {};
        const mediaUrl = typeof mediaItem === 'string' ? mediaItem : (mediaItem.url || '');
        const mediaType = (mediaItem.type === 'video' || /\.(mp4|webm|mov)/i.test(mediaUrl) ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO';

        const reactionsObj = (s.reactions && typeof s.reactions === 'object' ? s.reactions : {}) as Record<string, any>;
        const reactionsCount: Record<string, number> = {};
        for (const [uid, rType] of Object.entries(reactionsObj)) {
          const typeStr = typeof rType === 'string' ? rType : rType?.type || 'paws';
          reactionsCount[typeStr] = (reactionsCount[typeStr] || 0) + 1;
        }

        const userReaction = viewerId && reactionsObj[viewerId] ? (typeof reactionsObj[viewerId] === 'string' ? reactionsObj[viewerId] : reactionsObj[viewerId].type) : null;

        return {
          id: s.id,
          author_id: s.user_id,
          author_name: author?.display_name || author?.username || 'Feeder Guardian',
          author_username: author?.username || 'feeder',
          author_avatar: author?.avatar_url || '',
          media_url: mediaUrl,
          media_type: mediaType,
          caption: s.content || undefined,
          created_at: s.created_at,
          expires_at: s.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          has_viewed: viewedSet.has(s.id),
          reactions: reactionsCount,
          user_reaction: userReaction,
          viewer_count: typeof s.stats?.views_count === 'number' ? s.stats.views_count : 0,
        };
      });
    } catch (err) {
      console.error('[StoryService] Error fetching stories from Supabase:', err);
      return [];
    }
  }

  /**
   * Create a 24-hour temporary story in Supabase social_posts
   */
  static async createStory(params: {
    authorId: string;
    mediaUrl: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    caption?: string;
  }): Promise<string> {
    const supabase = getSupabaseServerClient();
    const storyId = crypto.randomUUID();
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: newStory, error } = await supabase
      .from('social_posts')
      .insert({
        id: storyId,
        record_type: 'story',
        user_id: params.authorId,
        content: params.caption || '',
        data: {
          story_id: storyId,
          media_type: params.mediaType || 'IMAGE',
          expires_at: expiresAt,
        },
        media: [
          {
            url: params.mediaUrl,
            type: (params.mediaType || 'IMAGE').toLowerCase(),
          },
        ],
        reactions: {},
        comments: { count: 0 },
        hashtags: [],
        mentions: [],
        visibility: 'public',
        is_active: true,
        is_deleted: false,
        stats: { views_count: 0 },
        created_at: createdAt,
        updated_at: createdAt,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('[StoryService] Supabase insert story error:', error);
      throw new Error(error.message);
    }

    return storyId;
  }

  /**
   * Record a view on a story in Supabase platform_data
   */
  static async markViewed(storyId: string, viewerId: string) {
    try {
      const supabase = getSupabaseServerClient();

      const { data: existing } = await supabase
        .from('platform_data')
        .select('id')
        .eq('data_type', 'audit')
        .eq('user_id', viewerId)
        .eq('target_id', storyId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('platform_data').insert({
          data_type: 'audit',
          user_id: viewerId,
          target_id: storyId,
          data: { action: 'story_view', viewed_at: new Date().toISOString() },
          status: 'active',
        });

        // Increment views count on story
        const { data: story } = await supabase
          .from('social_posts')
          .select('stats')
          .eq('id', storyId)
          .maybeSingle();

        if (story) {
          const currentStats = (story.stats && typeof story.stats === 'object' ? story.stats : {}) as any;
          const updatedViews = (currentStats.views_count || 0) + 1;
          await supabase
            .from('social_posts')
            .update({ stats: { ...currentStats, views_count: updatedViews } })
            .eq('id', storyId);
        }
      }
    } catch (supaErr) {
      console.warn('[StoryService] Supabase view tracking notice:', supaErr);
    }
  }

  /**
   * Get list of users who viewed this story (for story author)
   */
  static async getStoryViewers(storyId: string, requestingUserId: string): Promise<StoryViewer[]> {
    const supabase = getSupabaseServerClient();

    const { data: story, error: storyErr } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', storyId)
      .maybeSingle();

    if (!story || storyErr) return [];
    if (story.user_id !== requestingUserId) {
      throw new Error('FORBIDDEN');
    }

    const { data: viewsData } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'audit')
      .eq('target_id', storyId)
      .order('created_at', { ascending: false });

    if (!viewsData || viewsData.length === 0) return [];

    const viewerIds = Array.from(new Set(viewsData.map((v) => v.user_id).filter(Boolean)));
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .in('id', viewerIds);

    const usersMap = new Map<string, DbUser>();
    if (usersData) {
      usersData.forEach((u) => usersMap.set(u.id, u as DbUser));
    }

    return viewsData.map((v) => {
      const u = usersMap.get(v.user_id);
      return {
        user_id: v.user_id,
        full_name: u?.display_name || u?.username || 'Feeder User',
        username: u?.username || 'feeder',
        avatar_url: u?.avatar_url || '',
        viewed_at: v.data?.viewed_at || v.created_at,
      };
    });
  }

  /**
   * Add or toggle reaction on a story
   */
  static async reactToStory(params: {
    storyId: string;
    userId: string;
    reactionType: string;
  }): Promise<{ reaction: string | null; count: number }> {
    const supabase = getSupabaseServerClient();

    const { data: story, error } = await supabase
      .from('social_posts')
      .select('reactions')
      .eq('id', params.storyId)
      .maybeSingle();

    if (error || !story) {
      return { reaction: null, count: 0 };
    }

    const reactions = (story.reactions && typeof story.reactions === 'object' ? story.reactions : {}) as Record<string, any>;
    let newReaction: string | null = params.reactionType;

    if (reactions[params.userId] === params.reactionType) {
      delete reactions[params.userId];
      newReaction = null;
    } else {
      reactions[params.userId] = params.reactionType;
    }

    await supabase
      .from('social_posts')
      .update({ reactions, updated_at: new Date().toISOString() })
      .eq('id', params.storyId);

    const count = Object.keys(reactions).length;
    return { reaction: newReaction, count };
  }

  /**
   * Delete a story (author or staff)
   */
  static async deleteStory(storyId: string, userId: string, userRole: string = 'USER'): Promise<boolean> {
    const supabase = getSupabaseServerClient();

    const { data: story, error } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', storyId)
      .maybeSingle();

    if (error || !story) {
      throw new Error('NOT_FOUND');
    }

    const isAuthor = story.user_id === userId;
    const isStaff = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR', 'MODERATOR'].includes(userRole);

    if (!isAuthor && !isStaff) {
      throw new Error('FORBIDDEN');
    }

    const { error: delError } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', storyId);

    return !delError;
  }
}
