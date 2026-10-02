import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import logger from '@/lib/monitoring/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { spotId, date, timeSlot, action = 'CLAIM' } = body; // action: 'CLAIM' | 'RELEASE'

    if (!spotId || !date || !timeSlot) {
      return NextResponse.json(
        { success: false, error: 'Feeding Spot ID, date, and time slot are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Check if shift already exists
    const { data: existingShifts } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'feeding_shift')
      .eq('target_id', spotId);

    const matchingShift = (existingShifts || []).find(
      (s: any) => s.data?.date === date && s.data?.time_slot === timeSlot
    );

    if (action === 'CLAIM') {
      if (matchingShift && matchingShift.status === 'CLAIMED' && matchingShift.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'This shift has already been claimed by another volunteer.' },
          { status: 409 }
        );
      }

      if (matchingShift) {
        // Update existing shift
        const { data: updated, error } = await supabase
          .from('platform_data')
          .update({
            user_id: user.id,
            status: 'CLAIMED',
            data: {
              ...matchingShift.data,
              volunteer_name: user.fullName,
              volunteer_avatar: user.avatarUrl,
              claimed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchingShift.id)
          .select()
          .single();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, shift: updated });
      } else {
        // Insert new shift record
        const { data: inserted, error } = await supabase
          .from('platform_data')
          .insert({
            data_type: 'feeding_shift',
            target_id: spotId,
            user_id: user.id,
            status: 'CLAIMED',
            data: {
              date,
              time_slot: timeSlot,
              volunteer_name: user.fullName,
              volunteer_avatar: user.avatarUrl,
              claimed_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, shift: inserted });
      }
    } else if (action === 'RELEASE') {
      if (!matchingShift) {
        return NextResponse.json({ success: false, error: 'Shift record not found' }, { status: 404 });
      }

      if (matchingShift.user_id !== user.id && user.role !== 'PLATFORM_ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Forbidden. You can only release shifts you claimed.' },
          { status: 403 }
        );
      }

      const { data: updated, error } = await supabase
        .from('platform_data')
        .update({
          user_id: null,
          status: 'AVAILABLE',
          data: {
            ...matchingShift.data,
            volunteer_name: null,
            volunteer_avatar: null,
            released_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchingShift.id)
        .select()
        .single();

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, shift: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
