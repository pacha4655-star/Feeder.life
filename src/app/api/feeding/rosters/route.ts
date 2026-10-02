import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import logger from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Fetch Feeding Spots
    const { data: spotsRows } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'feeding_spot')
      .order('created_at', { ascending: false });

    // 2. Fetch Shifts for date
    const { data: shiftsRows } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'feeding_shift');

    const spots = (spotsRows || []).map((s: any) => ({
      id: s.id,
      name: s.data?.name || 'Community Spot',
      area_name: s.data?.area_name || s.data?.city || 'Neighborhood',
      animal_count: s.data?.animal_count || 4,
      animal_type: s.data?.animal_type || 'Dogs',
      preferred_food: s.data?.preferred_food || 'Kibble / Boiled Rice',
      regular_feeder_name: s.data?.regular_feeder_name || 'Community Volunteers',
      status: s.status || 'ACTIVE',
    }));

    const shifts = (shiftsRows || []).map((sh: any) => ({
      id: sh.id,
      spot_id: sh.target_id,
      date: sh.data?.date,
      time_slot: sh.data?.time_slot || 'MORNING', // 'MORNING' | 'AFTERNOON' | 'EVENING'
      volunteer_id: sh.user_id,
      volunteer_name: sh.data?.volunteer_name,
      volunteer_avatar: sh.data?.volunteer_avatar,
      status: sh.status || 'AVAILABLE', // 'AVAILABLE' | 'CLAIMED' | 'COMPLETED' | 'MISSED'
      completed_at: sh.data?.completed_at,
      photo_url: sh.data?.photo_url,
      notes: sh.data?.notes,
    }));

    return NextResponse.json({ success: true, spots, shifts, date });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
