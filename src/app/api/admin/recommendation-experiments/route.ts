import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/security/rbac';
import { FeederSenseExperimentService } from '@/lib/recommendation/experiment-framework';
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
        { error: 'Forbidden: PLATFORM_ADMIN authorization required for experiment management' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rangeParam = searchParams.get('range');
    const range: '7d' | '14d' | '30d' | '90d' =
      rangeParam === '7d' ? '7d' : rangeParam === '14d' ? '14d' : rangeParam === '90d' ? '90d' : '30d';

    const report = await FeederSenseExperimentService.getExperimentComparisonReport(range);
    const config = FeederSenseExperimentService.getConfig();

    return NextResponse.json({
      success: true,
      config,
      report,
    });
  } catch (error: any) {
    logger.error('Admin recommendation experiments API GET error', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    if (!isPlatformAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: PLATFORM_ADMIN authorization required for experiment management' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, updates } = body;

    if (action === 'EMERGENCY_ROLLBACK') {
      const rolledBackConfig = FeederSenseExperimentService.emergencyRollback();
      logger.warn('FeederSense emergency rollback triggered by admin', { adminId: user.id });
      return NextResponse.json({
        success: true,
        message: 'Emergency rollback active. Traffic locked to 100% FeederSense V1.0 Control.',
        config: rolledBackConfig,
      });
    }

    if (action === 'UPDATE_CONFIG' && updates) {
      const updatedConfig = FeederSenseExperimentService.updateConfig(updates);
      logger.info('FeederSense experiment config updated by admin', { adminId: user.id, updates });
      return NextResponse.json({
        success: true,
        message: 'Experiment configuration updated successfully.',
        config: updatedConfig,
      });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    logger.error('Admin recommendation experiments API POST error', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
