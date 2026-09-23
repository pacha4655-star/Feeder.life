import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: requests, error } = await supabase
      .from('platform_data')
      .select('*')
      .eq('user_id', user.id)
      .in('data_type', ['support_request', 'report', 'problem_report'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const formattedRequests = (requests || []).map((req, idx) => {
      const data = req.data || {};
      return {
        id: req.id || `req_${idx + 1000}`,
        ticketNumber: req.id.startsWith('req_') ? req.id.replace('req_', '#') : `#${1020 + idx}`,
        type: req.data_type,
        category: data.category || data.target_type || data.reason || 'General Issue',
        description: data.description || data.details || 'Support inquiry submitted by user.',
        status: req.status || 'Submitted',
        createdAt: req.created_at || data.created_at || new Date().toISOString(),
        updatedAt: req.updated_at || new Date().toISOString(),
        screenshotUrl: data.screenshot_url || null,
        deviceInfo: data.device_info || null,
        responses: data.responses || [
          {
            author: 'Feeder Safety Desk',
            role: 'Support Agent',
            message: 'Your request has been received and is queued for verification with the guardian response team.',
            createdAt: req.created_at || new Date().toISOString(),
          },
        ],
      };
    });

    return NextResponse.json({ success: true, requests: formattedRequests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { type, category, description, screenshotUrl, deviceInfo, targetId, targetType } = body;

    if (!category || !description) {
      return NextResponse.json(
        { success: false, error: 'Category and description are required.' },
        { status: 400 }
      );
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least 10 characters in the description.' },
        { status: 400 }
      );
    }

    const ticketId = `req_${Math.floor(1000 + Math.random() * 9000)}`;
    const supabase = getSupabaseServerClient();

    const insertPayload = {
      id: ticketId,
      data_type: type === 'report_abuse' ? 'report' : 'support_request',
      user_id: user.id,
      target_id: targetId || null,
      status: 'Submitted',
      data: {
        category,
        description: trimmedDesc,
        screenshot_url: screenshotUrl || null,
        device_info: deviceInfo || null,
        target_type: targetType || null,
        created_at: new Date().toISOString(),
        responses: [
          {
            author: 'Feeder Support Desk',
            role: 'System',
            message: 'Your request has been received and is queued for verification.',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };

    const { error: insertErr } = await supabase.from('platform_data').insert(insertPayload);

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      ticketId,
      ticketNumber: `#${ticketId.replace('req_', '')}`,
      message: 'Support request submitted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
