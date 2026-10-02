import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { LostFoundService } from '@/lib/services/lost-found';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ success: false, error: 'Report ID required' }, { status: 400 });
    }

    const report = await LostFoundService.getReport(reportId);
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const matches = await LostFoundService.evaluateAndAttachMatches(report);

    return NextResponse.json({
      success: true,
      matches,
      safetyNotice:
        'Potential matches are calculated based on physical attribute, date, and radius heuristics. Human guardian visual verification is strictly required.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
