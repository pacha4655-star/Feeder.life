import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/security/rbac';
import { RecommendationMetricsService } from '@/lib/recommendation/metrics-service';
import logger from '@/lib/monitoring/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    if (!isPlatformAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: PLATFORM_ADMIN authorization required to access recommendation metrics' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rangeParam = searchParams.get('range');
    const range: '7d' | '30d' | '90d' =
      rangeParam === '7d' ? '7d' : rangeParam === '90d' ? '90d' : '30d';

    const report = await RecommendationMetricsService.getMetricsReport(range);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Admin recommendation metrics API error', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
