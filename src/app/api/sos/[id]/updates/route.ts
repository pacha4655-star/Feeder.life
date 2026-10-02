import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { SosService } from '@/lib/services/sos';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';

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
    const { text, photoUrl, statusChange } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Update note is required' }, { status: 400 });
    }

    await SosService.addCaseUpdate(
      sosId,
      user.id,
      user.fullName,
      user.avatarUrl || undefined,
      sanitizeText(text).slice(0, 1000),
      photoUrl ? (sanitizeUrl(photoUrl) || undefined) : undefined,
      statusChange
    );

    return NextResponse.json({ success: true, message: 'Update added to case timeline' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
