import { getSupabaseServerClient } from '../supabase/server';

export interface CreateSosInput {
  reporterId: string;
  emergencyType: 'INJURED_ANIMAL' | 'ACCIDENT' | 'ABANDONED' | 'ANIMAL_IN_DANGER' | 'TRAPPED' | 'CRUELTY' | 'OTHER';
  animalType: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  approxLocationName: string;
  approxLat: number;
  approxLon: number;
  mediaUrls?: string[];
  contactPreference?: 'IN_APP' | 'PHONE_ON_REQUEST' | 'COMMUNITY';
}

export interface SosCaseView {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_avatar: string;
  reporter_role: string;
  emergency_type: string;
  animal_type: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  approx_location_name: string;
  approx_lat: number;
  approx_lon: number;
  distance_km?: number;
  media_urls: string[];
  contact_preference: string;
  status: 'OPEN' | 'HELP_REQUESTED' | 'RESPONDING' | 'RESOLVED' | 'CLOSED';
  responder_count: number;
  is_user_responding?: boolean;
  created_at: string;
  updates: Array<{
    id: string;
    user_name: string;
    update_text: string;
    status_change?: string;
    created_at: string;
  }>;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export class SosService {
  static async getActiveCases(userLat?: number | null, userLon?: number | null, userId?: string): Promise<SosCaseView[]> {
    try {
      const supabase = getSupabaseServerClient();
      const { data: rows, error } = await supabase
        .from('animals')
        .select('*, users!animals_created_by_fkey(id, username, display_name, avatar_url, role)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error || !rows) return [];

      return rows
        .filter((r: any) => r.sos_data && Object.keys(r.sos_data).length > 0)
        .map((r: any) => {
          const sos = r.sos_data || {};
          const approxLat = sos.approx_lat || 12.9784;
          const approxLon = sos.approx_lon || 77.6408;
          let dist: number | undefined = undefined;
          if (userLat != null && userLon != null) {
            dist = haversineDistanceKm(userLat, userLon, approxLat, approxLon);
          }

          const media: string[] = Array.isArray(r.media)
            ? r.media.map((m: any) => (typeof m === 'string' ? m : m.url))
            : [];

          return {
            id: r.id,
            reporter_id: r.created_by,
            reporter_name: r.users?.display_name || 'Guardian',
            reporter_avatar: r.users?.avatar_url || '',
            reporter_role: r.users?.role || 'USER',
            emergency_type: sos.emergency_type || 'INJURED_ANIMAL',
            animal_type: r.species || 'Canine',
            urgency: sos.urgency || 'HIGH',
            title: r.name || sos.title || 'Emergency Case',
            description: r.description || sos.description || '',
            approx_location_name: r.city || sos.approx_location_name || '',
            approx_lat: approxLat,
            approx_lon: approxLon,
            distance_km: dist,
            media_urls: media,
            contact_preference: sos.contact_preference || 'IN_APP',
            status: (sos.status || 'OPEN') as any,
            responder_count: Array.isArray(r.followers) ? r.followers.length : 0,
            is_user_responding: userId ? Array.isArray(r.followers) && r.followers.includes(userId) : false,
            created_at: r.created_at,
            updates: [],
          };
        });
    } catch {
      return [];
    }
  }

  static async createCase(input: CreateSosInput): Promise<string> {
    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();
    const mediaList = (input.mediaUrls || []).map((url) => ({ url, type: 'image' }));

    // Insert into Supabase animals table
    const { data: newAnimal, error } = await supabase
      .from('animals')
      .insert({
        name: input.title.slice(0, 80),
        species: input.animalType.toLowerCase().slice(0, 50),
        description: input.description,
        city: input.approxLocationName.slice(0, 100),
        created_by: input.reporterId,
        status: 'active',
        profile_data: {},
        medical_data: {},
        feeding_data: {},
        sos_data: {
          emergency_type: input.emergencyType,
          urgency: input.urgency,
          title: input.title,
          description: input.description,
          approx_location_name: input.approxLocationName,
          approx_lat: input.approxLat,
          approx_lon: input.approxLon,
          contact_preference: input.contactPreference || 'IN_APP',
          status: 'OPEN',
          created_at: nowIso,
        },
        rescue_data: {},
        adoption_data: {},
        veterinary_data: {},
        media: mediaList,
        followers: [input.reporterId],
      })
      .select('id')
      .single();

    if (error || !newAnimal) {
      console.error('SOS insert error:', error);
      throw new Error(error?.message || 'Failed to create SOS emergency');
    }

    // Insert into Supabase social_posts table so the community sees it
    await supabase.from('social_posts').insert({
      user_id: input.reporterId,
      record_type: 'post',
      content: input.description,
      data: {
        title: `[URGENT SOS] ${input.title}`,
        content_type: 'HELP_REQUEST',
        location_name: input.approxLocationName,
        approx_lat: input.approxLat,
        approx_lon: input.approxLon,
      },
      media: mediaList,
      reactions: {},
      comments: {},
      hashtags: ['sos', 'emergency'],
      mentions: [],
      visibility: 'public',
      is_active: true,
      is_deleted: false,
      stats: {},
    });

    return newAnimal.id;
  }

  static async respondToSos(sosId: string, userId: string, notes?: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    const { data: animal } = await supabase
      .from('animals')
      .select('id, followers, sos_data')
      .eq('id', sosId)
      .maybeSingle();

    if (animal) {
      const followers: string[] = Array.isArray(animal.followers) ? animal.followers : [];
      if (!followers.includes(userId)) {
        followers.push(userId);
      }
      const updatedSosData = {
        ...(animal.sos_data || {}),
        status: 'HELP_REQUESTED',
      };
      await supabase
        .from('animals')
        .update({
          followers,
          sos_data: updatedSosData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sosId);
    }
  }

  static async updateStatus(
    sosId: string,
    userId: string,
    newStatus: 'HELP_REQUESTED' | 'RESPONDING' | 'RESOLVED' | 'CLOSED',
    note: string,
    userRole?: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();
    const { data: animal } = await supabase
      .from('animals')
      .select('id, created_by, sos_data')
      .eq('id', sosId)
      .maybeSingle();

    if (!animal) {
      throw new Error('NOT_FOUND');
    }

    const isReporter = animal.created_by === userId;
    const isStaff = userRole === 'PLATFORM_ADMIN' || userRole === 'PLATFORM_MODERATOR';

    if (!isReporter && !isStaff) {
      throw new Error('FORBIDDEN');
    }

    const updatedSosData = {
      ...(animal.sos_data || {}),
      status: newStatus,
      resolved_at: newStatus === 'RESOLVED' || newStatus === 'CLOSED' ? new Date().toISOString() : undefined,
    };

    await supabase
      .from('animals')
      .update({
        sos_data: updatedSosData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sosId);
  }
}
