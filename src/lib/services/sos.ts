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
  radiusKm?: number; // 2, 3, 5
}

export interface SosResponderInfo {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  status: 'RESPONDING' | 'ON_THE_WAY' | 'ARRIVED' | 'TREATMENT_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  eta_notes?: string;
  updated_at: string;
}

export interface SosUpdateItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  update_text: string;
  status_change?: string;
  photo_url?: string;
  created_at: string;
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
  status: 'OPEN' | 'RESPONDING' | 'ON_THE_WAY' | 'ARRIVED' | 'TREATMENT_IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  responder_count: number;
  is_user_responding?: boolean;
  user_responder_status?: string;
  created_at: string;
  responders: SosResponderInfo[];
  updates: SosUpdateItem[];
  resolution?: {
    resolved_at: string;
    resolved_by: string;
    resolution_type: string;
    destination?: string;
    notes?: string;
    photo_url?: string;
  };
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  static async getActiveCases(
    userLat?: number | null,
    userLon?: number | null,
    userId?: string
  ): Promise<SosCaseView[]> {
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
          const approxLat = typeof sos.approx_lat === 'number' ? sos.approx_lat : null;
          const approxLon = typeof sos.approx_lon === 'number' ? sos.approx_lon : null;
          let dist: number | undefined = undefined;
          if (userLat != null && userLon != null && approxLat != null && approxLon != null) {
            dist = haversineDistanceKm(userLat, userLon, approxLat, approxLon);
          }

          const media: string[] = Array.isArray(r.media)
            ? r.media.map((m: any) => (typeof m === 'string' ? m : m.url))
            : [];

          const respondersList: SosResponderInfo[] = Array.isArray(sos.responders) ? sos.responders : [];
          const userResponder = userId ? respondersList.find((res) => res.user_id === userId) : undefined;

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
            responder_count: respondersList.length || (Array.isArray(r.followers) ? r.followers.length : 0),
            is_user_responding: Boolean(userResponder),
            user_responder_status: userResponder?.status,
            created_at: r.created_at,
            responders: respondersList,
            updates: Array.isArray(sos.updates) ? sos.updates : [],
            resolution: sos.resolution,
          };
        });
    } catch {
      return [];
    }
  }

  static async getCaseById(
    sosId: string,
    userLat?: number | null,
    userLon?: number | null,
    userId?: string
  ): Promise<SosCaseView | null> {
    try {
      const supabase = getSupabaseServerClient();
      const { data: r, error } = await supabase
        .from('animals')
        .select('*, users!animals_created_by_fkey(id, username, display_name, avatar_url, role)')
        .eq('id', sosId)
        .maybeSingle();

      if (error || !r || !r.sos_data) return null;

      const sos = r.sos_data || {};
      const approxLat = typeof sos.approx_lat === 'number' ? sos.approx_lat : null;
      const approxLon = typeof sos.approx_lon === 'number' ? sos.approx_lon : null;
      let dist: number | undefined = undefined;
      if (userLat != null && userLon != null && approxLat != null && approxLon != null) {
        dist = haversineDistanceKm(userLat, userLon, approxLat, approxLon);
      }

      const media: string[] = Array.isArray(r.media)
        ? r.media.map((m: any) => (typeof m === 'string' ? m : m.url))
        : [];

      const respondersList: SosResponderInfo[] = Array.isArray(sos.responders) ? sos.responders : [];
      const userResponder = userId ? respondersList.find((res) => res.user_id === userId) : undefined;

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
        responder_count: respondersList.length || (Array.isArray(r.followers) ? r.followers.length : 0),
        is_user_responding: Boolean(userResponder),
        user_responder_status: userResponder?.status,
        created_at: r.created_at,
        responders: respondersList,
        updates: Array.isArray(sos.updates) ? sos.updates : [],
        resolution: sos.resolution,
      };
    } catch {
      return null;
    }
  }

  static async createCase(input: CreateSosInput): Promise<string> {
    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();
    const mediaList = (input.mediaUrls || []).map((url) => ({ url, type: 'image' }));
    const targetRadius = input.radiusKm || 3; // 2km, 3km, 5km

    // 1. Insert into Supabase animals table with structured sos_data
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
          responders: [],
          updates: [
            {
              id: 'init',
              user_id: input.reporterId,
              user_name: 'Reporter',
              update_text: `SOS incident reported: ${input.title}`,
              status_change: 'OPEN',
              created_at: nowIso,
            },
          ],
          target_radius_km: targetRadius,
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

    // 2. Publish to community social feed
    await supabase.from('social_posts').insert({
      user_id: input.reporterId,
      record_type: 'post',
      content: input.description,
      data: {
        title: `[EMERGENCY SOS - ${input.urgency}] ${input.title}`,
        content_type: 'HELP_REQUEST',
        location_name: input.approxLocationName,
        approx_lat: input.approxLat,
        approx_lon: input.approxLon,
        animal_type: input.animalType,
        urgency: input.urgency,
        sos_id: newAnimal.id,
      },
      media: mediaList,
      reactions: {},
      comments: {},
      hashtags: ['sos', 'emergency', input.urgency.toLowerCase()],
      mentions: [],
      visibility: 'public',
      is_active: true,
      is_deleted: false,
      stats: {},
    });

    // 3. Geo-Targeted Notification Dispatch within radius
    try {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, profile_data')
        .neq('id', input.reporterId);

      const nearbyNotifications: any[] = [];

      for (const u of allUsers || []) {
        const uLat = u.profile_data?.approx_lat;
        const uLon = u.profile_data?.approx_lon;
        if (typeof uLat === 'number' && typeof uLon === 'number') {
          const dist = haversineDistanceKm(input.approxLat, input.approxLon, uLat, uLon);
          if (dist <= targetRadius) {
            nearbyNotifications.push({
              data_type: 'notification',
              user_id: u.id,
              target_user_id: input.reporterId,
              target_id: newAnimal.id,
              status: 'UNREAD',
              data: {
                type: 'SOS_NEARBY',
                title: `🚨 [${input.urgency} SOS] ${input.animalType} needs help (~${dist}km away)`,
                body: `${input.title} reported near ${input.approxLocationName}. Can you respond or assist?`,
                target_url: `/sos/${newAnimal.id}`,
                distance_km: dist,
                urgency: input.urgency,
              },
            });
          }
        }
      }

      if (nearbyNotifications.length > 0) {
        await supabase.from('platform_data').insert(nearbyNotifications.slice(0, 50));
      }
    } catch (notifErr) {
      console.warn('Geo notification dispatch error:', notifErr);
    }

    return newAnimal.id;
  }

  static async respondToSos(
    sosId: string,
    userId: string,
    userName: string,
    userAvatar?: string,
    etaNotes?: string,
    responderStatus: 'RESPONDING' | 'ON_THE_WAY' | 'ARRIVED' | 'TREATMENT_IN_PROGRESS' = 'RESPONDING'
  ): Promise<void> {
    const supabase = getSupabaseServerClient();
    const { data: animal } = await supabase
      .from('animals')
      .select('id, followers, sos_data')
      .eq('id', sosId)
      .maybeSingle();

    if (!animal) throw new Error('Case not found');

    const sosData = animal.sos_data || {};
    const responders: SosResponderInfo[] = Array.isArray(sosData.responders) ? sosData.responders : [];
    const nowIso = new Date().toISOString();

    const existingIdx = responders.findIndex((r) => r.user_id === userId);
    if (existingIdx >= 0) {
      responders[existingIdx] = {
        ...responders[existingIdx],
        status: responderStatus,
        eta_notes: etaNotes || responders[existingIdx].eta_notes,
        updated_at: nowIso,
      };
    } else {
      responders.push({
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar,
        status: responderStatus,
        eta_notes: etaNotes || 'Committed to assist',
        updated_at: nowIso,
      });
    }

    const followers: string[] = Array.isArray(animal.followers) ? animal.followers : [];
    if (!followers.includes(userId)) {
      followers.push(userId);
    }

    // Update case status to RESPONDING if currently OPEN
    let nextCaseStatus = sosData.status || 'OPEN';
    if (nextCaseStatus === 'OPEN') {
      nextCaseStatus = 'RESPONDING';
    }

    const updates: SosUpdateItem[] = Array.isArray(sosData.updates) ? sosData.updates : [];
    updates.push({
      id: String(Date.now()),
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      update_text: `${userName} joined response: ${responderStatus.replace('_', ' ')}${etaNotes ? ` (${etaNotes})` : ''}`,
      status_change: responderStatus,
      created_at: nowIso,
    });

    await supabase
      .from('animals')
      .update({
        followers,
        sos_data: {
          ...sosData,
          status: nextCaseStatus,
          responders,
          updates,
        },
        updated_at: nowIso,
      })
      .eq('id', sosId);
  }

  static async addCaseUpdate(
    sosId: string,
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    updateText: string,
    photoUrl?: string,
    statusChange?: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();
    const { data: animal } = await supabase
      .from('animals')
      .select('id, sos_data')
      .eq('id', sosId)
      .maybeSingle();

    if (!animal) throw new Error('Case not found');

    const sosData = animal.sos_data || {};
    const updates: SosUpdateItem[] = Array.isArray(sosData.updates) ? sosData.updates : [];
    const nowIso = new Date().toISOString();

    updates.push({
      id: String(Date.now()),
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      update_text: updateText,
      status_change: statusChange,
      photo_url: photoUrl,
      created_at: nowIso,
    });

    const updatedSos = {
      ...sosData,
      status: statusChange || sosData.status,
      updates,
    };

    await supabase
      .from('animals')
      .update({
        sos_data: updatedSos,
        updated_at: nowIso,
      })
      .eq('id', sosId);
  }

  static async resolveCase(
    sosId: string,
    userId: string,
    userName: string,
    resolutionType: string,
    destination: string,
    notes: string,
    photoUrl?: string,
    userRole?: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();
    const { data: animal } = await supabase
      .from('animals')
      .select('id, created_by, sos_data')
      .eq('id', sosId)
      .maybeSingle();

    if (!animal) throw new Error('NOT_FOUND');

    const isReporter = animal.created_by === userId;
    const isStaff = userRole === 'PLATFORM_ADMIN' || userRole === 'PLATFORM_MODERATOR';

    if (!isReporter && !isStaff) {
      throw new Error('FORBIDDEN');
    }

    const sosData = animal.sos_data || {};
    const nowIso = new Date().toISOString();
    const updates: SosUpdateItem[] = Array.isArray(sosData.updates) ? sosData.updates : [];

    updates.push({
      id: String(Date.now()),
      user_id: userId,
      user_name: userName,
      update_text: `Case resolved: ${resolutionType}. Destination: ${destination || 'On-site recovery'}.\n${notes || ''}`,
      status_change: 'RESOLVED',
      photo_url: photoUrl,
      created_at: nowIso,
    });

    const updatedSosData = {
      ...sosData,
      status: 'RESOLVED',
      resolved_at: nowIso,
      resolution: {
        resolved_at: nowIso,
        resolved_by: userName,
        resolution_type: resolutionType,
        destination,
        notes,
        photo_url: photoUrl,
      },
      updates,
    };

    await supabase
      .from('animals')
      .update({
        sos_data: updatedSosData,
        updated_at: nowIso,
      })
      .eq('id', sosId);
  }
}
