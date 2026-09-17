import { NextRequest, NextResponse } from 'next/server';
import { SosService } from '@/lib/services/sos';
import { getCurrentUser } from '@/lib/auth/session';
import { validateSosPayload } from '@/lib/validation/schemas';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const userLat = latParam ? parseFloat(latParam) : null;
    const userLon = lonParam ? parseFloat(lonParam) : null;

    const cases = await SosService.getActiveCases(userLat, userLon, user ? user.id : undefined);
    return NextResponse.json({ success: true, cases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Rate limiting: SOS creation
    const rateLimit = checkRateLimit('sos_create', user.id, RATE_LIMIT_CONFIG.sosCreation);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const validation = validateSosPayload(body);
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error || 'Invalid SOS input' }, { status: 400 });
    }

    const validated = validation.data;

    const caseId = await SosService.createCase({
      reporterId: user.id,
      emergencyType: validated.emergencyType as any,
      animalType: validated.animalType,
      urgency: validated.urgency,
      title: validated.title,
      description: validated.description,
      approxLocationName: validated.approxLocationName,
      approxLat: validated.approxLat ?? 0,
      approxLon: validated.approxLon ?? 0,
      mediaUrls: validated.mediaUrls,
      contactPreference: validated.contactPreference as any,
    });

    return NextResponse.json({ success: true, caseId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
