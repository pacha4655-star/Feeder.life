import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import logger from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'my_applications'; // 'my_applications' | 'reviewer'

    const supabase = getSupabaseServerClient();
    const isStaff = user.role === 'PLATFORM_ADMIN' || user.role === 'PLATFORM_MODERATOR';

    let query = supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'adoption_application')
      .order('created_at', { ascending: false });

    if (view === 'my_applications' && !isStaff) {
      query = query.eq('user_id', user.id);
    } else if (view === 'reviewer' && !isStaff) {
      // Return applications for animals created by this user
      const { data: myAnimals } = await supabase
        .from('animals')
        .select('id')
        .eq('created_by', user.id);
      const myAnimalIds = (myAnimals || []).map((a) => a.id);

      if (myAnimalIds.length === 0) {
        return NextResponse.json({ success: true, applications: [] });
      }

      query = query.in('target_id', myAnimalIds);
    }

    const { data: rows, error } = await query;

    if (error) {
      logger.error('Error fetching adoption applications', error);
      return NextResponse.json({ success: true, applications: [] });
    }

    const applications = (rows || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      animal_id: r.target_id,
      status: r.status || 'SUBMITTED',
      data: r.data || {},
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
