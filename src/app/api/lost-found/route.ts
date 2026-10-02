import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { LostFoundService } from '@/lib/services/lost-found';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') as 'LOST' | 'FOUND' | null;
    const species = searchParams.get('species') || undefined;
    const status = searchParams.get('status') || undefined;
    const myReports = searchParams.get('myReports') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let userId: string | undefined = undefined;
    if (myReports) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    const { reports, total } = await LostFoundService.listReports({
      reportType: reportType || undefined,
      species,
      status,
      userId,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      reports,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Please sign in to post a report' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('create_lost_found', user.id, { limit: 15, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const {
      reportType,
      animalName,
      species,
      breed,
      coatColor,
      distinctiveMarkings,
      approxAge,
      gender,
      dateLostFound,
      approxLocationName,
      approxLat,
      approxLon,
      mediaUrls,
      description,
      contactPreference,
      contactPhone,
    } = body;

    if (!coatColor || !approxLocationName || !description) {
      return NextResponse.json(
        { success: false, error: 'Coat color, location, and description are required.' },
        { status: 400 }
      );
    }

    const report = await LostFoundService.createReport(user.id, user.fullName, user.avatarUrl, {
      report_type: reportType === 'FOUND' ? 'FOUND' : 'LOST',
      animal_name: animalName,
      species: species || 'Dog',
      breed,
      coat_color: coatColor,
      distinctive_markings: distinctiveMarkings,
      approx_age: approxAge,
      gender: gender || 'UNKNOWN',
      date_lost_found: dateLostFound,
      approx_location_name: approxLocationName,
      approx_lat: approxLat,
      approx_lon: approxLon,
      media_urls: mediaUrls,
      description,
      contact_preference: contactPreference || 'IN_APP',
      contact_phone: contactPhone,
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
