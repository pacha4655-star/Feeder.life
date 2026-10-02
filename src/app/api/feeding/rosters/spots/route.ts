import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, areaName, animalCount, animalType, preferredFood, notes } = body;

    if (!name || !areaName) {
      return NextResponse.json(
        { success: false, error: 'Spot name and area location are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: newSpot, error } = await supabase
      .from('platform_data')
      .insert({
        data_type: 'feeding_spot',
        user_id: user.id,
        status: 'ACTIVE',
        data: {
          name: sanitizeText(name).slice(0, 100),
          area_name: sanitizeText(areaName).slice(0, 100),
          animal_count: Number(animalCount) || 4,
          animal_type: animalType ? sanitizeText(animalType).slice(0, 50) : 'Dogs & Cats',
          preferred_food: preferredFood ? sanitizeText(preferredFood).slice(0, 100) : 'Kibble & Rice',
          notes: notes ? sanitizeText(notes).slice(0, 500) : '',
          created_by_name: user.fullName,
          regular_feeder_name: user.fullName,
        },
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating feeding spot', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, spot: newSpot });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
