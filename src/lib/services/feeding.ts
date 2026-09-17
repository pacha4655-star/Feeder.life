import { getSupabaseServerClient } from '../supabase/server';

export interface CreateFeedingLogInput {
  userId: string;
  animalType: string;
  animalCount: number;
  foodType: string;
  quantityDesc?: string;
  approxLocationName: string;
  approxLat?: number;
  approxLon?: number;
  notes?: string;
  photoUrl?: string;
  visibility: 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';
}

export class FeedingService {
  static async getRecentLogs(limit = 20, userId?: string) {
    try {
      const supabase = getSupabaseServerClient();
      let query = supabase
        .from('social_posts')
        .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url)')
        .eq('record_type', 'post')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.or(`visibility.eq.public,user_id.eq.${userId}`);
      } else {
        query = query.eq('visibility', 'public');
      }

      const { data: rows } = await query;

      return (rows || [])
        .filter((f: any) => f.data?.content_type === 'FEEDING_UPDATE' || f.data?.animal_type)
        .map((f: any) => ({
          id: f.id,
          user_id: f.user_id,
          user_name: f.users?.display_name || 'Feeder',
          user_username: f.users?.username || 'feeder',
          user_avatar: f.users?.avatar_url || '',
          animal_type: f.data?.animal_type || 'Canine',
          animal_count: f.data?.animal_count || 1,
          food_type: f.data?.food_type || 'Kibble',
          quantity_desc: f.data?.quantity_desc || '',
          approx_location_name: f.data?.location_name || '',
          approx_lat: f.data?.approx_lat || null,
          approx_lon: f.data?.approx_lon || null,
          notes: f.content || '',
          photo_url: Array.isArray(f.media) && f.media.length > 0 ? (typeof f.media[0] === 'string' ? f.media[0] : f.media[0].url) : null,
          visibility: (f.visibility || 'public').toUpperCase(),
          fed_at: f.created_at,
        }));
    } catch {
      return [];
    }
  }

  static async getUserStats(userId: string) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: rows } = await supabase
        .from('social_posts')
        .select('data')
        .eq('user_id', userId)
        .eq('is_deleted', false);

      let totalAnimals = 0;
      let totalLogs = 0;
      for (const r of rows || []) {
        if (r.data?.content_type === 'FEEDING_UPDATE' || r.data?.animal_type) {
          totalAnimals += Number(r.data?.animal_count) || 1;
          totalLogs += 1;
        }
      }

      return {
        totalAnimalsFed: totalAnimals,
        totalFeedingRounds: totalLogs,
        weeklyStreakDays: Math.min(totalLogs, 7),
      };
    } catch {
      return {
        totalAnimalsFed: 0,
        totalFeedingRounds: 0,
        weeklyStreakDays: 0,
      };
    }
  }

  static async createLog(input: CreateFeedingLogInput): Promise<string> {
    const supabase = getSupabaseServerClient();
    const mediaList = input.photoUrl ? [{ url: input.photoUrl, type: 'image' }] : [];
    const title = `Feeding Update: Fed ${input.animalCount} ${input.animalType}`;
    const body = `${input.foodType}${input.quantityDesc ? ` (${input.quantityDesc})` : ''} distributed at ${input.approxLocationName}.\n\n${input.notes || ''}`;

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: input.userId,
        record_type: 'post',
        content: body,
        data: {
          title,
          content_type: 'FEEDING_UPDATE',
          location_name: input.approxLocationName,
          approx_lat: input.approxLat || null,
          approx_lon: input.approxLon || null,
          animal_type: input.animalType,
          animal_count: input.animalCount,
          food_type: input.foodType,
          quantity_desc: input.quantityDesc || '',
        },
        media: mediaList,
        reactions: {},
        comments: {},
        hashtags: ['feeding'],
        mentions: [],
        visibility: (input.visibility || 'public').toLowerCase(),
        is_active: true,
        is_deleted: false,
        stats: {},
      })
      .select('id')
      .single();

    if (error || !post) {
      console.error('Feeding insert error:', error);
      throw new Error(error?.message || 'Failed to log feeding round');
    }

    return post.id;
  }
}
