import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { SosService } from '@/lib/services/sos';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sosId } = await context.params;
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null;

    const sosCase = await SosService.getCaseById(sosId, lat, lon, user?.id);

    if (!sosCase) {
      return NextResponse.json({ success: false, error: 'SOS case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: sosCase });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
