import { NextRequest, NextResponse } from 'next/server';
import { FeedingService } from '@/lib/services/feeding';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const logs = await FeedingService.getRecentLogs(30, user ? user.id : undefined);
    const stats = user
      ? await FeedingService.getUserStats(user.id)
      : { totalAnimalsFed: 0, totalFeedingRounds: 0, weeklyStreakDays: 0 };

    return NextResponse.json({ success: true, logs, stats });
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
    const body = await request.json().catch(() => ({}));

    const logId = await FeedingService.createLog({
      userId: user.id,
      animalType: body.animalType || 'Street Dogs',
      animalCount: parseInt(body.animalCount || '1', 10),
      foodType: body.foodType || 'Balanced Kibble & Rice',
      quantityDesc: body.quantityDesc,
      approxLocationName: body.approxLocationName || 'Local Neighborhood',
      approxLat: body.approxLat || 12.9784,
      approxLon: body.approxLon || 77.6408,
      notes: body.notes,
      photoUrl: body.photoUrl,
      visibility: body.visibility || 'PUBLIC',
    });

    return NextResponse.json({ success: true, logId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
