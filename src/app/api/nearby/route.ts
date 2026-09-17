import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userLat = parseFloat(searchParams.get('lat') || '12.9784');
    const userLon = parseFloat(searchParams.get('lon') || '77.6408');
    const radius = parseFloat(searchParams.get('radius') || '10');

    const supabase = getSupabaseServerClient();

    // 1. Fetch real emergency SOS / animal cases
    const { data: animalRows } = await supabase
      .from('animals')
      .select('*, users!animals_created_by_fkey(id, username, display_name)')
      .in('status', ['emergency', 'active'])
      .order('created_at', { ascending: false })
      .limit(20);

    const sosItems = (animalRows || [])
      .filter((a: any) => a.sos_data && Object.keys(a.sos_data).length > 0)
      .map((a: any) => {
        const lat = a.sos_data?.approx_lat || a.feeding_data?.approx_lat || 12.9784;
        const lon = a.sos_data?.approx_lon || a.feeding_data?.approx_lon || 77.6408;
        const dist = haversineDistanceKm(userLat, userLon, lat, lon);
        return {
          id: a.id,
          type: 'SOS',
          title: a.name || a.sos_data?.title || 'Animal Emergency',
          subtitle: `Target: ${a.species} - ${(a.sos_data?.urgency || 'HIGH').toUpperCase()} URGENCY`,
          approxLocation: a.city || a.sos_data?.approx_location_name || 'Nearby Area',
          distanceKm: dist,
          badge: (a.sos_data?.urgency || 'HIGH').toUpperCase(),
          icon: '🚨',
          color: '#ef4444',
        };
      });

    // 2. Fetch real feeding updates / posts
    const { data: postRows } = await supabase
      .from('social_posts')
      .select('*, users!social_posts_user_id_fkey(id, username, display_name)')
      .eq('is_deleted', false)
      .eq('post_type', 'feeding')
      .order('created_at', { ascending: false })
      .limit(20);

    const feedItems = (postRows || []).map((p: any) => {
      const lat = p.location?.lat || 12.9784;
      const lon = p.location?.lng || 77.6408;
      const dist = haversineDistanceKm(userLat, userLon, lat, lon);
      return {
        id: p.id,
        type: 'FEEDER',
        title: p.users?.display_name || 'Community Feeder',
        subtitle: p.title || 'Feeding round logged',
        approxLocation: p.location_name || 'Local Area',
        distanceKm: dist,
        badge: 'Active Feed',
        icon: '🐾',
        color: '#10b981',
      };
    });

    const items = [...sosItems, ...feedItems].filter((item) => item.distanceKm <= radius);

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('Nearby error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
