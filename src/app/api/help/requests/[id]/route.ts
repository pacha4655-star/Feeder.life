import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { id } = await params;
    const cleanId = id.startsWith('#') ? `req_${id.replace('#', '')}` : id;

    const supabase = getSupabaseServerClient();
    const { data: reqItem, error } = await supabase
      .from('platform_data')
      .select('*')
      .eq('id', cleanId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !reqItem) {
      return NextResponse.json({ success: false, error: 'Support request not found or access denied.' }, { status: 404 });
    }

    const data = reqItem.data || {};
    const formattedRequest = {
      id: reqItem.id,
      ticketNumber: reqItem.id.startsWith('req_') ? reqItem.id.replace('req_', '#') : `#${reqItem.id}`,
      type: reqItem.data_type,
      category: data.category || data.target_type || data.reason || 'General Issue',
      description: data.description || data.details || 'Support inquiry details.',
      status: reqItem.status || 'Submitted',
      createdAt: reqItem.created_at || data.created_at || new Date().toISOString(),
      updatedAt: reqItem.updated_at || new Date().toISOString(),
      screenshotUrl: data.screenshot_url || null,
      deviceInfo: data.device_info || null,
      responses: data.responses || [
        {
          author: 'Feeder Safety Desk',
          role: 'Support Agent',
          message: 'Your request has been received and is currently under review by our guardian support team.',
          createdAt: reqItem.created_at || new Date().toISOString(),
        },
      ],
    };

    return NextResponse.json({ success: true, request: formattedRequest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
