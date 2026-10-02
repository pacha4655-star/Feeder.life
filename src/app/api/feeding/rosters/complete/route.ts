import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      shiftId,
      spotId,
      date,
      timeSlot,
      animalsFedCount = 4,
      foodType = 'Kibble & Rice',
      photoUrl,
      notes = '',
    } = body;

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch or create the completed shift record
    let shiftRecordId = shiftId;

    if (shiftId) {
      await supabase
        .from('platform_data')
        .update({
          status: 'COMPLETED',
          data: {
            date,
            time_slot: timeSlot,
            volunteer_name: user.fullName,
            volunteer_avatar: user.avatarUrl,
            completed_at: nowIso,
            animals_fed_count: Number(animalsFedCount) || 1,
            food_type: foodType,
            photo_url: photoUrl ? sanitizeUrl(photoUrl) : null,
            notes: notes ? sanitizeText(notes).slice(0, 500) : '',
          },
          updated_at: nowIso,
        })
        .eq('id', shiftId);
    } else if (spotId) {
      const { data: newShift } = await supabase
        .from('platform_data')
        .insert({
          data_type: 'feeding_shift',
          target_id: spotId,
          user_id: user.id,
          status: 'COMPLETED',
          data: {
            date: date || nowIso.split('T')[0],
            time_slot: timeSlot || 'MORNING',
            volunteer_name: user.fullName,
            volunteer_avatar: user.avatarUrl,
            completed_at: nowIso,
            animals_fed_count: Number(animalsFedCount) || 1,
            food_type: foodType,
            photo_url: photoUrl ? sanitizeUrl(photoUrl) : null,
            notes: notes ? sanitizeText(notes).slice(0, 500) : '',
          },
        })
        .select('id')
        .single();

      shiftRecordId = newShift?.id;
    }

    // 2. Fetch Spot details for feed announcement
    let spotName = 'Neighborhood Spot';
    if (spotId) {
      const { data: spot } = await supabase
        .from('platform_data')
        .select('data')
        .eq('id', spotId)
        .maybeSingle();
      if (spot?.data?.name) spotName = spot.data.name;
    }

    // 3. Post to social feed as a verified feeding round
    const mediaList = photoUrl ? [{ url: photoUrl, type: 'image' }] : [];
    await supabase.from('social_posts').insert({
      user_id: user.id,
      record_type: 'post',
      content: `Completed ${timeSlot || 'Scheduled'} Feeding Shift at ${spotName}.\nFed ${animalsFedCount} community animals with ${foodType}.\n\n${notes || ''}`,
      data: {
        title: `Roster Feeding Completed: ${spotName}`,
        content_type: 'FEEDING_UPDATE',
        location_name: spotName,
        animal_type: 'Community Animals',
        animal_count: Number(animalsFedCount) || 1,
        food_type: foodType,
        shift_id: shiftRecordId,
      },
      media: mediaList,
      reactions: {},
      comments: {},
      hashtags: ['feeding', 'roster', 'community'],
      mentions: [],
      visibility: 'public',
      is_active: true,
      is_deleted: false,
      stats: {},
    });

    return NextResponse.json({ success: true, message: 'Shift marked completed and logged.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
