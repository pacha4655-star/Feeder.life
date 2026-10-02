import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { LostFoundService } from '@/lib/services/lost-found';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { candidateId, action, notes = '' } = body;

    if (!candidateId || !['CONFIRM', 'REJECT', 'REPORT_INCORRECT'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid candidateId and action (CONFIRM, REJECT, REPORT_INCORRECT) required' },
        { status: 400 }
      );
    }

    const isAdmin = user.role === 'PLATFORM_ADMIN' || user.role === 'PLATFORM_MODERATOR';

    const updated = await LostFoundService.recordMatchAction(
      id,
      user.id,
      candidateId,
      action as any,
      notes,
      isAdmin
    );

    return NextResponse.json({
      success: true,
      report: updated,
      message:
        action === 'CONFIRM'
          ? 'Match confirmed! Report marked as resolved.'
          : action === 'REJECT'
          ? 'Candidate match dismissed.'
          : 'Report marked as incorrect candidate match.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
