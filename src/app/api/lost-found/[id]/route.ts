import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { LostFoundService } from '@/lib/services/lost-found';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const report = await LostFoundService.getReport(id);

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
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
    const { status, description, contactPreference } = body;

    const isAdmin = user.role === 'PLATFORM_ADMIN' || user.role === 'PLATFORM_MODERATOR';

    const updated = await LostFoundService.updateReport(
      id,
      user.id,
      {
        status,
        description,
        contact_preference: contactPreference,
      },
      isAdmin
    );

    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
