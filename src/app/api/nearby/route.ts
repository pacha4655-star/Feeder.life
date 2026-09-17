import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { NearbyWelfareService } from '@/lib/services/nearby';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    const rateLimitKey = user ? user.id : clientIp;

    // Rate limiting: 120 queries per minute
    const rateLimit = checkRateLimit('nearby_query', rateLimitKey, { limit: 120, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const searchParams = request.nextUrl.searchParams;
    const rawLat = searchParams.get('lat');
    const rawLon = searchParams.get('lon') || searchParams.get('lng');
    const rawRadius = searchParams.get('radius') || '10';
    const rawType = (searchParams.get('type') || 'ALL').toUpperCase();

    // Strict validation: Coordinates are required. No hardcoded city or country fallback.
    if (!rawLat || !rawLon) {
      return NextResponse.json(
        {
          success: false,
          error: 'Latitude and longitude parameters are required for nearby discovery.',
          items: [],
        },
        { status: 400 }
      );
    }

    const lat = parseFloat(rawLat);
    const lon = parseFloat(rawLon);
    const radiusKm = Math.min(Math.max(parseFloat(rawRadius) || 10, 0.5), 200);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid coordinates provided. Latitude must be between -90 and 90, longitude between -180 and 180.',
          items: [],
        },
        { status: 400 }
      );
    }

    const validTypes = ['ALL', 'FEEDERS', 'SOS', 'COMMUNITIES'] as const;
    const filterType = validTypes.includes(rawType as any) ? (rawType as any) : 'ALL';

    const items = await NearbyWelfareService.getNearbyActivity({
      lat,
      lon,
      radiusKm,
      type: filterType,
      userId: user ? user.id : undefined,
    });

    return NextResponse.json({
      success: true,
      userCoordinates: {
        approxLat: Math.round(lat * 100) / 100, // Privacy-safe approximate coordinate
        approxLon: Math.round(lon * 100) / 100,
      },
      radiusKm,
      filterType,
      count: items.length,
      items,
    });
  } catch (error: any) {
    logger.error('Nearby API server error', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Nearby activity is temporarily unavailable.',
        items: [],
      },
      { status: 500 }
    );
  }
}
