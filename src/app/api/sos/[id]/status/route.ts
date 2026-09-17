import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { SosService } from '@/lib/services/sos';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sosId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { status, note } = body;

    const validStatuses = ['HELP_REQUESTED', 'RESPONDING', 'RESOLVED', 'CLOSED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Valid status is required' }, { status: 400 });
    }

    try {
      await SosService.updateStatus(sosId, user.id, status, note || `Status updated to ${status}`, user.role);
      return NextResponse.json({ success: true });
    } catch (authErr: any) {
      if (authErr.message === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, error: 'You are not authorized to update this emergency case.' },
          { status: 403 }
        );
      }
      if (authErr.message === 'NOT_FOUND') {
        return NextResponse.json({ success: false, error: 'SOS case not found.' }, { status: 404 });
      }
      throw authErr;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
