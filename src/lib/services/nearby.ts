import { getSupabaseServerClient } from '../supabase/server';

export interface NearbyWelfareItem {
  id: string;
  type: 'FEEDER' | 'SOS' | 'COMMUNITY' | 'POST';
  title: string;
  subtitle: string;
  approxLocation: string;
  distanceKm: number;
  badge: string;
  icon: string;
  color: string;
  createdAt: string;
  mediaUrls?: string[];
  status?: string;
  urgency?: string;
  species?: string;
  authorName?: string;
  authorAvatar?: string;
}

export interface GetNearbyInput {
  lat: number;
  lon: number;
  radiusKm: number;
  type?: 'ALL' | 'FEEDERS' | 'SOS' | 'COMMUNITIES';
  userId?: string;
}

/**
 * High-precision Haversine formula for spherical distance in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

export class NearbyWelfareService {
  /**
   * Fetch real active animal welfare activity around a user's exact coordinates.
   * Enforces global location, exact radius filtering, and privacy-safe field stripping.
   */
  static async getNearbyActivity(input: GetNearbyInput): Promise<NearbyWelfareItem[]> {
    const { lat, lon, radiusKm, type = 'ALL', userId } = input;
    const supabase = getSupabaseServerClient();
    const items: NearbyWelfareItem[] = [];

    // 1. Fetch Real Active Emergency SOS Alerts from `animals` table
    if (type === 'ALL' || type === 'SOS') {
      try {
        const { data: animalsData, error: animalsError } = await supabase
          .from('animals')
          .select('*, users!animals_created_by_fkey(id, username, display_name, avatar_url)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!animalsError && animalsData) {
          for (const a of animalsData) {
            const sos = a.sos_data;
            if (!sos || typeof sos !== 'object') continue;

            const sosStatus = (sos.status || 'OPEN').toUpperCase();
            // Exclude resolved or closed emergencies
            if (sosStatus === 'RESOLVED' || sosStatus === 'CLOSED') continue;

            const targetLat = typeof sos.approx_lat === 'number' ? sos.approx_lat : a.feeding_data?.approx_lat;
            const targetLon = typeof sos.approx_lon === 'number' ? sos.approx_lon : a.feeding_data?.approx_lon;

            // Only include items with valid real coordinates
            if (typeof targetLat !== 'number' || typeof targetLon !== 'number') continue;
            if (isNaN(targetLat) || isNaN(targetLon)) continue;

            const dist = haversineDistanceKm(lat, lon, targetLat, targetLon);
            if (dist <= radiusKm) {
              const urgency = (sos.urgency || 'HIGH').toUpperCase();
              const urgencyColor =
                urgency === 'CRITICAL' ? '#dc2626' : urgency === 'HIGH' ? '#ea580c' : '#0284c7';

              const mediaList: string[] = Array.isArray(a.media)
                ? a.media.map((m: any) => (typeof m === 'string' ? m : m.url)).filter(Boolean)
                : [];

              items.push({
                id: a.id,
                type: 'SOS',
                title: a.name || sos.title || 'Animal Emergency Case',
                subtitle: `Species: ${a.species || 'Animal'} • ${urgency} Urgency • ${sosStatus}`,
                approxLocation: a.city || sos.approx_location_name || 'Nearby Area',
                distanceKm: dist,
                badge: `${urgency} SOS`,
                icon: '🚨',
                color: urgencyColor,
                createdAt: a.created_at,
                mediaUrls: mediaList,
                status: sosStatus,
                urgency,
                species: a.species,
                authorName: a.users?.display_name || a.users?.username || 'Welfare Guardian',
                authorAvatar: a.users?.avatar_url || '',
              });
            }
          }
        }
      } catch (sosErr) {
        console.error('[NearbyService] Error querying animals for SOS:', sosErr);
      }
    }

    // 2. Fetch Real Feeding Logs & Welfare Posts from `social_posts` table
    if (type === 'ALL' || type === 'FEEDERS') {
      try {
        let query = supabase
          .from('social_posts')
          .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url)')
          .eq('record_type', 'post')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(60);

        if (userId) {
          query = query.or(`visibility.eq.public,user_id.eq.${userId}`);
        } else {
          query = query.eq('visibility', 'public');
        }

        const { data: postsData, error: postsError } = await query;

        if (!postsError && postsData) {
          for (const p of postsData) {
            const dataObj = (p.data && typeof p.data === 'object' ? p.data : {}) as any;
            const isFeeding = dataObj.content_type === 'FEEDING_UPDATE' || dataObj.animal_type != null;

            if (type === 'FEEDERS' && !isFeeding) continue;

            const targetLat =
              typeof dataObj.approx_lat === 'number'
                ? dataObj.approx_lat
                : typeof p.location?.lat === 'number'
                ? p.location.lat
                : null;
            const targetLon =
              typeof dataObj.approx_lon === 'number'
                ? dataObj.approx_lon
                : typeof p.location?.lng === 'number'
                ? p.location.lng
                : null;

            if (targetLat == null || targetLon == null || isNaN(targetLat) || isNaN(targetLon)) continue;

            const dist = haversineDistanceKm(lat, lon, targetLat, targetLon);
            if (dist <= radiusKm) {
              const mediaList: string[] = Array.isArray(p.media)
                ? p.media.map((m: any) => (typeof m === 'string' ? m : m.url)).filter(Boolean)
                : [];

              const animalType = dataObj.animal_type || 'Street Animals';
              const animalCount = dataObj.animal_count ? ` (${dataObj.animal_count})` : '';

              items.push({
                id: p.id,
                type: isFeeding ? 'FEEDER' : 'POST',
                title: isFeeding
                  ? `Feeding Round: ${animalType}${animalCount}`
                  : p.users?.display_name || 'Community Update',
                subtitle: isFeeding
                  ? `${dataObj.food_type || 'Meals'} served by ${p.users?.display_name || 'Feeder'}`
                  : dataObj.title || p.content?.slice(0, 70) || 'Local welfare observation',
                approxLocation: dataObj.location_name || p.location_name || 'Neighborhood Zone',
                distanceKm: dist,
                badge: isFeeding ? 'Feeding Log' : 'Welfare Post',
                icon: isFeeding ? '🐾' : '📢',
                color: isFeeding ? '#059669' : '#0284c7',
                createdAt: p.created_at,
                mediaUrls: mediaList,
                authorName: p.users?.display_name || p.users?.username || 'Community Feeder',
                authorAvatar: p.users?.avatar_url || '',
              });
            }
          }
        }
      } catch (feedErr) {
        console.error('[NearbyService] Error querying social_posts for feeding:', feedErr);
      }
    }

    // 3. Fetch Real Active Communities with Valid Location
    if (type === 'ALL' || type === 'COMMUNITIES') {
      try {
        const { data: commsData, error: commsError } = await supabase
          .from('communities')
          .select('*')
          .eq('is_active', true)
          .limit(30);

        if (!commsError && commsData) {
          for (const c of commsData) {
            const meta = (c.metadata && typeof c.metadata === 'object' ? c.metadata : {}) as any;
            const targetLat =
              typeof c.location_lat === 'number'
                ? c.location_lat
                : typeof meta.approx_lat === 'number'
                ? meta.approx_lat
                : null;
            const targetLon =
              typeof c.location_lon === 'number'
                ? c.location_lon
                : typeof meta.approx_lon === 'number'
                ? meta.approx_lon
                : null;

            if (targetLat == null || targetLon == null || isNaN(targetLat) || isNaN(targetLon)) continue;

            const dist = haversineDistanceKm(lat, lon, targetLat, targetLon);
            if (dist <= radiusKm) {
              items.push({
                id: c.id,
                type: 'COMMUNITY',
                title: c.name || 'Welfare Circle',
                subtitle: `${c.member_count || 1} local guardians active`,
                approxLocation: c.city || meta.area_name || 'Local Area',
                distanceKm: dist,
                badge: 'Community Hub',
                icon: '👥',
                color: '#7c3aed',
                createdAt: c.created_at,
                mediaUrls: c.avatar_url ? [c.avatar_url] : [],
                authorName: c.name,
              });
            }
          }
        }
      } catch (commErr) {
        console.error('[NearbyService] Error querying communities:', commErr);
      }
    }

    // Sort all results strictly nearest -> farthest
    items.sort((a, b) => a.distanceKm - b.distanceKm);

    return items;
  }
}
