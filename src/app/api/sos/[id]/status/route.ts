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
    const { status, note, resolutionType, destination, photoUrl } = body;

    const validStatuses = [
      'OPEN',
      'RESPONDING',
      'ON_THE_WAY',
      'ARRIVED',
      'TREATMENT_IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Valid status is required' }, { status: 400 });
    }

    if (status === 'RESOLVED' || status === 'CLOSED') {
      await SosService.resolveCase(
        sosId,
        user.id,
        user.fullName,
        resolutionType || 'Treated & Secured',
        destination || 'Local Recovery',
        note || '',
        photoUrl,
        user.role
      );
    } else {
      await SosService.addCaseUpdate(
        sosId,
        user.id,
        user.fullName,
        user.avatarUrl,
        note || `Status updated to ${status.replace('_', ' ')}`,
        photoUrl,
        status
      );
    }

    return NextResponse.json({ success: true, message: 'Status updated successfully' });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to update this emergency case.' },
        { status: 403 }
      );
    }
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'SOS case not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
